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
    // CRM 분리:
    //   crm_renewal_notify — Basic 이상. 고객 보험 갱신일 자동 알림 (영업 기회 보호)
    //   crm_full           — Pro 이상. + 면책/감액 종료, 생일, 가입제안서 PDF 자동 파싱
    crm_renewal_notify?: boolean;
    crm_full?: boolean;
    // 상담 음성 메모 + AI 자동 요약:
    //   Free  — 사용 불가
    //   Basic — 평생 3번 (체험용 한도)
    //   Pro+  — 무제한 (consultation_memo_unlimited=true)
    consultation_memo_unlimited?: boolean;
}

// 상담 메모 평생 사용 한도 (slug 기반, features 없을 때 fallback)
export const CONSULTATION_MEMO_LIMIT_BY_SLUG: Record<string, number> = {
    free: 0,
    basic: 3,
    team_basic: 3,
    pro: -1,         // -1 = 무제한
    team_pro: -1,
};

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
    cancelled_at?: string;
    cancelled_by?: 'user' | 'admin' | 'auto' | null;
    cancel_at_period_end?: boolean;
    coupon_code?: string | null;
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
