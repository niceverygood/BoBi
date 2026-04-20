import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanFeatures } from '@/types/subscription';

const PRO_PLAN_SLUGS = new Set(['pro', 'team_pro']);

type FetchedPlan = {
    slug: string;
    features?: PlanFeatures | Record<string, boolean> | null;
} | null;

/**
 * 사용자의 활성 플랜을 조회한다. 없으면 무료로 간주.
 */
export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<FetchedPlan> {
    const { data } = await supabase
        .from('subscriptions')
        .select('plan:subscription_plans(slug, features)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

    const plan = (data?.[0] as { plan?: FetchedPlan } | undefined)?.plan;
    return plan ?? { slug: 'free', features: {} };
}

/**
 * Pro 전용 기능 사용 가능 여부.
 * DB plan.features에 키가 명시되어 있으면 그 값을 따르고, 없으면 slug(pro/team_pro) 기반 판정.
 */
export function canAccessProFeature(
    plan: FetchedPlan,
    feature: 'risk_report' | 'future_me' | 'virtual_receipt',
): boolean {
    if (!plan) return false;
    const features = (plan.features || {}) as Record<string, boolean | undefined>;
    const val = features[feature];
    if (val !== undefined) return val === true;
    return PRO_PLAN_SLUGS.has(plan.slug);
}
