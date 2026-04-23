import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanFeatures } from '@/types/subscription';

const PRO_PLAN_SLUGS = new Set(['pro', 'team_pro']);

type FetchedPlan = {
    slug: string;
    features?: PlanFeatures | Record<string, boolean> | null;
} | null;

/**
 * 활성 Pro 리워드(pro_grants)가 있는지 확인한다.
 * referral 등으로 부여된 임시 Pro 혜택 체크.
 */
async function hasActiveProGrant(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('pro_grants')
        .select('id')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .limit(1);
    return !!(data && data.length > 0);
}

async function fetchProPlan(supabase: SupabaseClient): Promise<FetchedPlan> {
    const { data } = await supabase
        .from('subscription_plans')
        .select('slug, features')
        .eq('slug', 'pro')
        .maybeSingle();
    return (data as FetchedPlan) ?? { slug: 'pro', features: {} };
}

/**
 * 사용자의 활성 플랜을 조회한다. 없으면 무료로 간주.
 * 7일 무료체험(status='trialing') 사용자는 체험 중인 플랜(보통 basic)으로 취급한다.
 * 활성 pro_grant가 있으면 구독 플랜보다 우선해 Pro로 승격한다.
 */
export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<FetchedPlan> {
    // 활성 Pro grant가 있으면 즉시 Pro 반환 (referral 리워드 등)
    if (await hasActiveProGrant(supabase, userId)) {
        return await fetchProPlan(supabase);
    }

    const { data } = await supabase
        .from('subscriptions')
        .select('plan:subscription_plans(slug, features)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
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

/**
 * CODEF 자동 조회(진료정보/건강검진/약관/보험 조회) 사용 가능 여부.
 * 무료 플랜은 막고, 베이직 이상(체험 포함) 허용.
 */
export function canAccessCodef(plan: FetchedPlan): boolean {
    if (!plan) return false;
    return plan.slug !== 'free';
}
