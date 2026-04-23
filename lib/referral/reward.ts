import type { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_MONTHLY_LIMIT, REFERRAL_PRO_GRANT_DAYS } from '@/types/referral';

export type RewardResult =
    | { ok: true; referralId: string; status: 'rewarded' | 'capped'; proGrantId: string | null }
    | { ok: false; reason: 'no_referral' | 'already_processed' | 'internal_error'; detail?: string };

/**
 * 친구(invitee)의 첫 결제 성공 이벤트를 받아 인바이터에게 Pro 1개월을 부여한다.
 *
 * 호출 조건:
 *   - inviteeUserId의 구독이 방금 'active'로 전이됨 (체험 종료 후 첫 결제 성공 또는 직접 결제)
 *   - 멱등성 보장을 위해 내부에서 중복 처리 방지
 *
 * 비즈니스 규칙:
 *   - 이번 달(인바이터 기준) 기보상 수가 REFERRAL_MONTHLY_LIMIT(3) 이상이면 capped 처리,
 *     Pro 지급 없이 기록만 남김
 *   - 월 한도 이내면 pro_grants에 30일 부여
 *
 * service role 권한으로 호출되어야 함 (billing-success 라우트에서 createServiceClient 사용).
 */
export async function processReferralReward(
    svc: SupabaseClient,
    inviteeUserId: string,
): Promise<RewardResult> {
    // 1. 해당 invitee에 대한 referral 레코드 조회
    const { data: ref, error: refErr } = await svc
        .from('referrals')
        .select('id, inviter_id, status')
        .eq('invitee_id', inviteeUserId)
        .maybeSingle();

    if (refErr) {
        return { ok: false, reason: 'internal_error', detail: refErr.message };
    }
    if (!ref) return { ok: false, reason: 'no_referral' };

    // 이미 처리되었거나 무효인 경우
    if (ref.status === 'rewarded' || ref.status === 'capped' || ref.status === 'voided') {
        return { ok: false, reason: 'already_processed', detail: ref.status };
    }

    const now = new Date();
    const inviterId = ref.inviter_id as string;
    const referralId = ref.id as string;

    // 2. 이번 달 인바이터가 이미 보상받은 개수 확인
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: rewardedCount, error: countErr } = await svc
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_id', inviterId)
        .eq('status', 'rewarded')
        .gte('rewarded_at', monthStart);

    if (countErr) {
        return { ok: false, reason: 'internal_error', detail: countErr.message };
    }

    const currentRewarded = rewardedCount ?? 0;

    // 먼저 first_paid 상태로 전이 (첫 결제 기록)
    const { error: firstPaidErr } = await svc
        .from('referrals')
        .update({
            status: currentRewarded >= REFERRAL_MONTHLY_LIMIT ? 'capped' : 'first_paid',
            first_paid_at: now.toISOString(),
        })
        .eq('id', referralId)
        .eq('status', 'signed_up'); // 멱등성: 상태 변화 안 했을 때만

    if (firstPaidErr) {
        return { ok: false, reason: 'internal_error', detail: firstPaidErr.message };
    }

    // 3. 월 한도 초과 시 capped 처리만 하고 종료
    if (currentRewarded >= REFERRAL_MONTHLY_LIMIT) {
        return { ok: true, referralId, status: 'capped', proGrantId: null };
    }

    // 4. Pro 1개월 부여 (pro_grants 삽입)
    const expiresAt = new Date(now.getTime() + REFERRAL_PRO_GRANT_DAYS * 24 * 60 * 60 * 1000);
    const { data: grant, error: grantErr } = await svc
        .from('pro_grants')
        .insert({
            user_id: inviterId,
            source: 'referral',
            source_ref_id: referralId,
            granted_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

    if (grantErr || !grant) {
        return { ok: false, reason: 'internal_error', detail: grantErr?.message ?? 'no grant returned' };
    }

    // 5. referral 상태를 rewarded로 최종 업데이트
    const { error: rewardErr } = await svc
        .from('referrals')
        .update({
            status: 'rewarded',
            rewarded_at: now.toISOString(),
        })
        .eq('id', referralId);

    if (rewardErr) {
        return { ok: false, reason: 'internal_error', detail: rewardErr.message };
    }

    return {
        ok: true,
        referralId,
        status: 'rewarded',
        proGrantId: grant.id as string,
    };
}

/**
 * 친구의 환불/해지로 리워드를 무효화한다.
 * 해당 referral + 연결된 pro_grant를 revoke.
 */
export async function voidReferralReward(
    svc: SupabaseClient,
    inviteeUserId: string,
    reason = 'refund',
): Promise<void> {
    const { data: ref } = await svc
        .from('referrals')
        .select('id, status')
        .eq('invitee_id', inviteeUserId)
        .maybeSingle();
    if (!ref) return;
    if (ref.status === 'voided') return;

    const now = new Date().toISOString();

    await svc
        .from('referrals')
        .update({ status: 'voided', voided_at: now, void_reason: reason })
        .eq('id', ref.id);

    // 연결된 활성 pro_grant revoke
    await svc
        .from('pro_grants')
        .update({ revoked_at: now, revoke_reason: reason })
        .eq('source_ref_id', ref.id)
        .is('revoked_at', null);
}
