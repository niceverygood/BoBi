import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 체험 기간(일) */
export const TRIAL_DAYS = 7;

/** 체험 지원 플랜 */
export const TRIAL_ELIGIBLE_PLANS = ['basic'] as const;
export type TrialEligiblePlan = typeof TRIAL_ELIGIBLE_PLANS[number];

export function isTrialEligiblePlan(slug: string): slug is TrialEligiblePlan {
    return (TRIAL_ELIGIBLE_PLANS as readonly string[]).includes(slug);
}

/**
 * 현재 시각 + TRIAL_DAYS 를 ISO 문자열로 반환.
 */
export function computeTrialEndsAt(base: Date = new Date()): string {
    const d = new Date(base);
    d.setDate(d.getDate() + TRIAL_DAYS);
    return d.toISOString();
}

export interface TrialEligibility {
    eligible: boolean;
    reason?: 'already_used' | 'has_active_sub' | 'unsupported_plan' | 'unauthenticated';
}

/**
 * 사용자가 특정 플랜에 대해 무료 체험 자격이 있는지 확인.
 * 규칙:
 *   - 해당 플랜을 이전에 체험한 적이 없어야 함
 *   - 현재 활성/체험중인 구독이 없어야 함 (무료 유저만 가능)
 *   - 체험 지원 플랜이어야 함 (현재 basic)
 */
export async function checkTrialEligibility(
    supabase: SupabaseClient,
    userId: string | null,
    planSlug: string,
): Promise<TrialEligibility> {
    if (!userId) return { eligible: false, reason: 'unauthenticated' };
    if (!isTrialEligiblePlan(planSlug)) return { eligible: false, reason: 'unsupported_plan' };

    // 이전 체험 이력
    const { data: history } = await supabase
        .from('trial_history')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_slug', planSlug)
        .maybeSingle();
    if (history) return { eligible: false, reason: 'already_used' };

    // 활성·체험중 구독 존재 여부
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .limit(1)
        .maybeSingle();
    if (activeSub) return { eligible: false, reason: 'has_active_sub' };

    return { eligible: true };
}
