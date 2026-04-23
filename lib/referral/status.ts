import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureReferralCode } from './code';
import { REFERRAL_MONTHLY_LIMIT, type ReferralStatusSummary, type ReferralStatus } from '@/types/referral';

/**
 * 이름을 마스킹한다 — "홍길동" → "홍○○", "김철" → "김○"
 */
function maskName(name: string | null | undefined): string | null {
    if (!name) return null;
    const trimmed = name.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length === 1) return trimmed;
    return trimmed[0] + '○'.repeat(Math.max(1, trimmed.length - 1));
}

/**
 * 사용자의 리퍼럴 요약을 조회한다.
 * - 코드가 없으면 생성한다 (베이직 이상 결제자는 호출 가능)
 * - 이번 달 리워드 수, 전체 초대 현황, 활성 Pro 혜택 만료일 포함
 */
export async function getReferralStatus(
    supabase: SupabaseClient,
    userId: string,
): Promise<ReferralStatusSummary> {
    const code = await ensureReferralCode(supabase, userId);

    const { data: referrals } = await supabase
        .from('referrals')
        .select('id, invitee_id, status, signed_up_at, first_paid_at, rewarded_at')
        .eq('inviter_id', userId)
        .order('signed_up_at', { ascending: false });

    const list = referrals ?? [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let totalSignedUp = 0;
    let totalPaid = 0;
    let totalRewarded = 0;
    let rewardedThisMonth = 0;

    for (const r of list) {
        totalSignedUp += 1;
        if (r.status === 'first_paid' || r.status === 'rewarded' || r.status === 'capped') {
            totalPaid += 1;
        }
        if (r.status === 'rewarded') {
            totalRewarded += 1;
            if (r.rewarded_at && r.rewarded_at >= monthStart) rewardedThisMonth += 1;
        }
    }

    // 활성 Pro grant 중 가장 늦은 만료일
    const { data: grants } = await supabase
        .from('pro_grants')
        .select('expires_at')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gt('expires_at', now.toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

    const activeProGrantExpiresAt = grants?.[0]?.expires_at ?? null;

    // invitee 이름은 별도 쿼리로 (auth.users에서 직접 못 읽으므로 profile 테이블 조인 또는 생략)
    // 본 MVP에서는 이름은 제공하지 않고 날짜만 노출 (프라이버시)
    const displayList = list.map((r) => ({
        id: r.id as string,
        inviteeMaskedName: null, // TODO: 필요 시 profiles 조인
        status: r.status as ReferralStatus,
        signedUpAt: r.signed_up_at as string,
        firstPaidAt: (r.first_paid_at as string | null) ?? null,
        rewardedAt: (r.rewarded_at as string | null) ?? null,
    }));

    return {
        code,
        totalInvited: list.length,
        totalSignedUp,
        totalPaid,
        totalRewarded,
        rewardedThisMonth,
        monthlyLimit: REFERRAL_MONTHLY_LIMIT,
        activeProGrantExpiresAt,
        referrals: displayList,
    };
}

void maskName; // 추후 profiles 조인 시 사용
