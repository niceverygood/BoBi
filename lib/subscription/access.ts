import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanFeatures } from '@/types/subscription';
import { CONSULTATION_MEMO_LIMIT_BY_SLUG } from '@/types/subscription';

const PRO_PLAN_SLUGS = new Set(['pro', 'team_pro']);

type FetchedPlan = {
    slug: string;
    features?: PlanFeatures | Record<string, boolean> | null;
} | null;

/**
 * 사용자의 활성 플랜을 조회한다. 없으면 무료로 간주.
 * 3일 무료체험(status='trialing') 사용자는 체험 중인 플랜(보통 basic)으로 취급한다.
 */
export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<FetchedPlan> {
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

/**
 * 상담 메모 평생 사용 한도.
 *   Free  → 0   (사용 불가)
 *   Basic → 3   (체험용)
 *   Pro+  → -1  (무제한)
 *
 * features.consultation_memo_unlimited === true 이면 plan slug와 무관하게 무제한.
 */
export function getConsultationMemoLimit(plan: FetchedPlan): number {
    if (!plan) return 0;
    const features = (plan.features || {}) as Record<string, boolean | undefined>;
    if (features.consultation_memo_unlimited === true) return -1;
    const limit = CONSULTATION_MEMO_LIMIT_BY_SLUG[plan.slug];
    return limit ?? 0;
}

/**
 * 사용자의 상담 메모 사용 가능 여부 + 잔여 횟수 계산.
 * 클라이언트·서버 양쪽에서 사용. supabase 인스턴스를 받아 user_id로 COUNT.
 */
export async function getConsultationMemoUsage(
    supabase: SupabaseClient,
    userId: string,
    plan: FetchedPlan,
): Promise<{
    limit: number;     // -1 = 무제한, 0 = 사용 불가, N = 평생 N번
    used: number;      // 지금까지 사용한 횟수
    remaining: number; // -1 = 무제한, N = 잔여 (음수 가능 — 한도 초과)
    canUse: boolean;
}> {
    const limit = getConsultationMemoLimit(plan);
    if (limit === 0) {
        return { limit: 0, used: 0, remaining: 0, canUse: false };
    }
    if (limit === -1) {
        return { limit: -1, used: 0, remaining: -1, canUse: true };
    }
    // 평생 사용 횟수 카운트
    const { count } = await supabase
        .from('consultation_memos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    const used = count || 0;
    const remaining = Math.max(0, limit - used);
    return { limit, used, remaining, canUse: remaining > 0 };
}
