// types/subscription.ts

export interface SubscriptionPlan {
    id: string;
    slug: 'free' | 'basic' | 'pro' | 'team_basic' | 'team_pro';
    display_name: string;
    price_monthly: number;
    price_yearly: number;
    max_analyses: number;      // -1 = unlimited
    max_file_size_mb: number;  // -1 = unlimited
    max_customers: number;     // -1 = unlimited
    history_days: number;      // -1 = unlimited
    features: PlanFeatures;
    sort_order: number;
}

export interface PlanFeatures {
    disclosure_analysis: boolean;
    product_match: boolean;
    claim_analysis: boolean;
    pdf_export: boolean;
    custom_product_db: boolean;
    priority_support: boolean;
    team_dashboard?: boolean;
    // Pro 전용 기능 (Free/Basic/Team_Basic에서는 잠금)
    risk_report?: boolean;
    future_me?: boolean;
    virtual_receipt?: boolean;
}

export interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: 'active' | 'trialing' | 'cancelled' | 'past_due';
    billing_cycle: 'monthly' | 'yearly';
    current_period_start: string;
    current_period_end: string;
    payment_provider?: string;
    payment_key?: string;
    cancel_at_period_end?: boolean;
    cancelled_at?: string | null;
    cancelled_by?: 'user' | 'admin' | null;
    trial_ends_at?: string | null;
    trial_used?: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    plan?: SubscriptionPlan;
}

export interface UsageTracking {
    id: string;
    user_id: string;
    period_start: string;
    period_end: string;
    analyses_used: number;
    analyses_limit: number;
    created_at: string;
    updated_at: string;
}

export interface CreditBalance {
    id: string;
    user_id: string;
    credits_remaining: number;
    credits_purchased: number;
    created_at: string;
    updated_at: string;
}

export interface CreditTransaction {
    id: string;
    user_id: string;
    pack_id: string;
    credits: number;
    amount: number;
    payment_key?: string;
    created_at: string;
}

export interface SubscriptionWithUsage {
    subscription: Subscription | null;
    plan: SubscriptionPlan;
    usage: UsageTracking;
    credits: number;       // 추가 크레딧 잔량
    canAnalyze: boolean;
    remainingAnalyses: number;  // -1 = unlimited
}
