'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SubscriptionPlan, Subscription, UsageTracking, SubscriptionWithUsage } from '@/types/subscription';

const DEFAULT_PLAN: SubscriptionPlan = {
    id: '',
    slug: 'free',
    display_name: '무료 체험',
    price_monthly: 0,
    price_yearly: 0,
    max_analyses: 3,
    max_file_size_mb: -1,
    max_customers: 3,
    history_days: 7,
    features: {
        disclosure_analysis: true,
        product_match: false,
        claim_analysis: false,
        pdf_export: false,
        custom_product_db: false,
        priority_support: false,
        risk_report: false,
        future_me: false,
        virtual_receipt: false,
    },
    sort_order: 0,
};

// Pro 전용 기능 (DB의 plan.features에 해당 키가 없을 때 slug 기반으로 판정)
const PRO_ONLY_FEATURES = new Set<keyof import('@/types/subscription').PlanFeatures>([
    'risk_report',
    'future_me',
    'virtual_receipt',
    'crm_full',
]);
// Basic 이상 (Free 잠금)
const BASIC_PLUS_FEATURES = new Set<keyof import('@/types/subscription').PlanFeatures>([
    'crm_renewal_notify',
]);
const PRO_PLAN_SLUGS = new Set(['pro', 'team_pro']);
const BASIC_PLUS_PLAN_SLUGS = new Set(['basic', 'pro', 'team_basic', 'team_pro']);

const DEFAULT_USAGE: UsageTracking = {
    id: '',
    user_id: '',
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
    analyses_used: 0,
    analyses_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export function useSubscription() {
    const [plan, setPlan] = useState<SubscriptionPlan>(DEFAULT_PLAN);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<UsageTracking>(DEFAULT_USAGE);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const hasFetched = useRef(false);

    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch active/trialing subscription with plan (최신 1건만)
            // 3일 무료체험(trialing) 사용자도 체험 중인 플랜으로 취급한다.
            const { data: subList } = await supabase
                .from('subscriptions')
                .select('*, plan:subscription_plans(*)')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .order('updated_at', { ascending: false })
                .limit(1);

            const subData = subList?.[0] || null;

            if (subData) {
                setSubscription(subData as unknown as Subscription);
                if (subData.plan) {
                    setPlan(subData.plan as unknown as SubscriptionPlan);
                }
            }

            // Fetch current month usage (use local date to avoid timezone issues)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const periodStart = `${year}-${month}-01`;

            const { data: usageData } = await supabase
                .from('usage_tracking')
                .select('*')
                .eq('user_id', user.id)
                .eq('period_start', periodStart)
                .maybeSingle();

            if (usageData) {
                setUsage(usageData as UsageTracking);
            }

            // Fetch credit balance
            const { data: creditData } = await supabase
                .from('credit_balances')
                .select('credits_remaining')
                .eq('user_id', user.id)
                .maybeSingle();

            if (creditData) {
                setCredits(creditData.credits_remaining ?? 0);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchSubscription();
        }
    }, [fetchSubscription]);

    // 플랜 한도 내이거나, 크레딧이 있으면 분석 가능
    const planLimitReached = plan.max_analyses !== -1 && usage.analyses_used >= usage.analyses_limit;
    const canAnalyze = plan.max_analyses === -1 || !planLimitReached || credits > 0;
    const canAnalyzeWithPlan = plan.max_analyses === -1 || usage.analyses_used < usage.analyses_limit;
    const needsCredit = planLimitReached && credits > 0;

    const remainingAnalyses = plan.max_analyses === -1
        ? -1
        : Math.max(0, usage.analyses_limit - usage.analyses_used);

    const isFeatureEnabled = (feature: keyof typeof plan.features): boolean => {
        const val = plan.features[feature];
        if (val !== undefined) return val === true;
        // DB에 키가 없는 경우: slug 기반 폴백
        if (PRO_ONLY_FEATURES.has(feature)) {
            return PRO_PLAN_SLUGS.has(plan.slug);
        }
        if (BASIC_PLUS_FEATURES.has(feature)) {
            return BASIC_PLUS_PLAN_SLUGS.has(plan.slug);
        }
        return false;
    };

    const result: SubscriptionWithUsage = {
        subscription: subscription ?? null,
        plan,
        usage,
        credits,
        canAnalyze,
        remainingAnalyses,
    };

    return {
        ...result,
        loading,
        error,
        isFeatureEnabled,
        canAnalyzeWithPlan,  // 플랜 한도 내인지 여부
        needsCredit,         // 크레딧으로 분석해야 하는지
        planLimitReached,    // 플랜 한도 도달했는지
        refresh: fetchSubscription,
    };
}
