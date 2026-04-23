import type { SupabaseClient } from '@supabase/supabase-js';
import { lookupInviterByCode } from './code';

export type ApplyReferralResult =
    | { ok: true; referralId: string }
    | { ok: false; reason: 'invalid_code' | 'self_referral' | 'already_applied' | 'invitee_has_paid_history' };

/**
 * 초대 코드를 현재 가입자에게 연결한다.
 * - 동일 사용자 자기참조 차단
 * - 이미 다른 코드로 적용된 경우 재적용 불가
 * - 이미 결제 이력이 있는 기존 사용자는 (뒤늦게 코드 적용해서 보상 받는 것 방지) 차단
 *
 * 서버 API 라우트에서 본인 권한으로 호출.
 */
export async function applyReferralCode(
    supabase: SupabaseClient,
    inviteeUserId: string,
    rawCode: string,
): Promise<ApplyReferralResult> {
    const inviterId = await lookupInviterByCode(supabase, rawCode);
    if (!inviterId) return { ok: false, reason: 'invalid_code' };
    if (inviterId === inviteeUserId) return { ok: false, reason: 'self_referral' };

    // 이미 이 사용자에 대해 referral 레코드가 있는지 확인
    const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('invitee_id', inviteeUserId)
        .maybeSingle();
    if (existing?.id) return { ok: false, reason: 'already_applied' };

    // 가입자가 이미 결제 이력이 있으면 차단 (신규 가입 직후에만 허용)
    const { data: pastSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', inviteeUserId)
        .in('status', ['active', 'past_due', 'cancelled'])
        .limit(1);
    if (pastSub && pastSub.length > 0) {
        return { ok: false, reason: 'invitee_has_paid_history' };
    }

    const normalized = rawCode.trim().toUpperCase();
    const { data: inserted, error } = await supabase
        .from('referrals')
        .insert({
            inviter_id: inviterId,
            invitee_id: inviteeUserId,
            code: normalized,
            status: 'signed_up',
        })
        .select('id')
        .single();

    if (error || !inserted) {
        throw new Error(`referral 생성 실패: ${error?.message ?? 'unknown'}`);
    }

    return { ok: true, referralId: inserted.id as string };
}
