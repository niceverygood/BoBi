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
    max_analyses: 5,
    max_file_size_mb: -1,
    max_customers: 5,
    history_days: 7,
    features: {
        disclosure_analysis: true,
        product_match: false,
        claim_analysis: false,
        pdf_export: false,
        custom_product_db: false,
        priority_support: false,
    },
    sort_order: 0,
};

const DEFAULT_USAGE: UsageTracking = {
    id: '',
    user_id: '',
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
    analyses_used: 0,
    analyses_limit: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export function useSubscription() {
    const [plan, setPlan] = useState<SubscriptionPlan>(DEFAULT_PLAN);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<UsageTracking>(DEFAULT_USAGE);
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

            // Fetch active subscription with plan
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('*, plan:subscription_plans(*)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

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

    const canAnalyze = plan.max_analyses === -1 || usage.analyses_used < usage.analyses_limit;

    const remainingAnalyses = plan.max_analyses === -1
        ? -1
        : Math.max(0, usage.analyses_limit - usage.analyses_used);

    const isFeatureEnabled = (feature: keyof typeof plan.features): boolean => {
        return plan.features[feature] === true;
    };

    const result: SubscriptionWithUsage = {
        subscription: subscription ?? null,
        plan,
        usage,
        canAnalyze,
        remainingAnalyses,
    };

    return {
        ...result,
        loading,
        error,
        isFeatureEnabled,
        refresh: fetchSubscription,
    };
}
