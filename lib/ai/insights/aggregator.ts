// lib/ai/insights/aggregator.ts
// 결제 전환·잔존율 분석을 위해 Supabase에서 핵심 지표를 집계.
// 직전 동일 기간(이전 1일/이전 7일)과 비교 가능한 형태로 묶어 반환.

import type { SupabaseClient } from '@supabase/supabase-js';

export type PeriodType = 'daily' | 'weekly';

export interface PeriodRange {
    start: string;     // ISO date YYYY-MM-DD
    end: string;       // ISO date YYYY-MM-DD (exclusive)
    label: string;     // 사람이 읽기 쉬운 라벨
}

export interface PeriodMetrics {
    range: PeriodRange;
    acquisition: { new_signups: number };
    activation: {
        users_with_first_analysis: number;
        first_analysis_rate_pct: number; // (first_analysis / signups) * 100
    };
    engagement: {
        active_users: number;             // 기간 내 1회 이상 분석한 유저
        analyses_count: number;
        pdf_exports: number;
    };
    conversion: {
        trials_started: number;
        direct_paid: number;              // 체험 거치지 않고 바로 결제
        trial_to_paid: number;            // 체험 시작 후 결제 전환된 수 (기간 내 발생 기준)
        paid_total: number;               // direct_paid + trial_to_paid
    };
    revenue: {
        gross_krw: number;
        by_provider: Record<string, { count: number; krw: number }>;
        coupon_redemptions: number;
    };
    retention_churn: {
        cancellations: number;
        churned_mrr_krw: number;
    };
    errors: {
        error_count: number;
        warn_count: number;
        top_events: Array<{ event: string; count: number }>;
        payment_failures: number;
    };
}

export interface AggregatedMetrics {
    period_type: PeriodType;
    current: PeriodMetrics;
    previous: PeriodMetrics;            // 직전 동일 길이 기간 (delta 비교용)
    deltas: Record<string, { current: number; previous: number; delta_pct: number | null }>;
}

// ── 기간 계산 ─────────────────────────────────────────

export function computeRanges(periodType: PeriodType, asOf: Date = new Date()): {
    current: PeriodRange;
    previous: PeriodRange;
} {
    const days = periodType === 'daily' ? 1 : 7;
    // end는 어제 자정(KST 기준 단순화 — UTC로 충분)
    const endDate = new Date(asOf);
    endDate.setUTCHours(0, 0, 0, 0);
    const currentEnd = new Date(endDate);
    const currentStart = new Date(endDate);
    currentStart.setUTCDate(currentStart.getUTCDate() - days);

    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
        current: {
            start: fmt(currentStart),
            end: fmt(currentEnd),
            label: periodType === 'daily' ? `${fmt(currentStart)} (1일)` : `${fmt(currentStart)} ~ ${fmt(currentEnd)} (7일)`,
        },
        previous: {
            start: fmt(previousStart),
            end: fmt(previousEnd),
            label: periodType === 'daily' ? `${fmt(previousStart)} (1일)` : `${fmt(previousStart)} ~ ${fmt(previousEnd)} (7일)`,
        },
    };
}

// ── 단일 기간 집계 ─────────────────────────────────────

async function aggregatePeriod(svc: SupabaseClient, range: PeriodRange): Promise<PeriodMetrics> {
    const startIso = `${range.start}T00:00:00Z`;
    const endIso = `${range.end}T00:00:00Z`;

    // 1) 신규 가입 — auth.users는 직접 카운트할 수 없어 profiles 사용
    const { count: newSignups } = await svc
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lt('created_at', endIso);

    // 2) 신규 가입자 중 분석 1건 이상한 사람
    const { data: signupIds } = await svc
        .from('profiles')
        .select('id')
        .gte('created_at', startIso)
        .lt('created_at', endIso);

    let usersWithFirstAnalysis = 0;
    if (signupIds && signupIds.length > 0) {
        const ids = signupIds.map(r => r.id);
        const { data: firstAnalyses } = await svc
            .from('analyses')
            .select('user_id')
            .in('user_id', ids)
            .gte('created_at', startIso)
            .lt('created_at', endIso);
        const uniqueIds = new Set((firstAnalyses || []).map(a => a.user_id));
        usersWithFirstAnalysis = uniqueIds.size;
    }
    const firstAnalysisRate = newSignups && newSignups > 0
        ? Math.round((usersWithFirstAnalysis / newSignups) * 1000) / 10
        : 0;

    // 3) 활성 유저 / 분석 건수 (기간 내)
    const { data: analysesInPeriod, count: analysesCount } = await svc
        .from('analyses')
        .select('user_id', { count: 'exact' })
        .gte('created_at', startIso)
        .lt('created_at', endIso);
    const activeUsers = new Set((analysesInPeriod || []).map((a: any) => a.user_id)).size;

    // PDF export — analyses에 export 기록 컬럼이 있다면. 없으면 0으로 둠.
    let pdfExports = 0;
    try {
        const { count } = await svc
            .from('analyses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lt('created_at', endIso)
            .not('exported_at', 'is', null);
        pdfExports = count || 0;
    } catch { /* column may not exist */ }

    // 4) 체험 시작 (trial_history)
    let trialsStarted = 0;
    try {
        const { count } = await svc
            .from('trial_history')
            .select('*', { count: 'exact', head: true })
            .gte('started_at', startIso)
            .lt('started_at', endIso);
        trialsStarted = count || 0;
    } catch { /* */ }

    // 5) 결제 (payments) — paid 상태만
    const { data: paidPayments } = await svc
        .from('payments')
        .select('user_id, amount, payment_method, created_at, status')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .eq('status', 'paid');

    let grossKrw = 0;
    const byProvider: Record<string, { count: number; krw: number }> = {};
    for (const p of paidPayments || []) {
        const amount = Number(p.amount) || 0;
        grossKrw += amount;
        const method = normalizeProvider(p.payment_method);
        if (!byProvider[method]) byProvider[method] = { count: 0, krw: 0 };
        byProvider[method].count++;
        byProvider[method].krw += amount;
    }

    // direct_paid vs trial_to_paid 분리:
    //   해당 user_id가 이전에 trial_history에 있고 converted된 경우 trial_to_paid
    //   아니면 direct_paid
    let trialToPaid = 0;
    let directPaid = 0;
    if (paidPayments && paidPayments.length > 0) {
        const userIds = [...new Set(paidPayments.map((p: any) => p.user_id))];
        const { data: trials } = await svc
            .from('trial_history')
            .select('user_id, converted, started_at')
            .in('user_id', userIds);
        const trialUserIds = new Set((trials || []).map((t: any) => t.user_id));
        for (const p of paidPayments) {
            if (trialUserIds.has(p.user_id)) trialToPaid++;
            else directPaid++;
        }
    }
    const paidTotal = directPaid + trialToPaid;

    // 쿠폰 사용
    let couponRedemptions = 0;
    try {
        const { count } = await svc
            .from('promo_code_redemptions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lt('created_at', endIso);
        couponRedemptions = count || 0;
    } catch { /* */ }

    // 6) 해지 / 이탈 MRR
    const { data: cancelledSubs } = await svc
        .from('subscriptions')
        .select('*, plan:subscription_plans(price_krw, slug)')
        .gte('cancelled_at', startIso)
        .lt('cancelled_at', endIso)
        .eq('status', 'cancelled');
    const cancellations = (cancelledSubs || []).length;
    let churnedMrr = 0;
    for (const s of cancelledSubs || []) {
        const plan = (s as any).plan;
        const price = Number(plan?.price_krw) || 0;
        churnedMrr += (s as any).billing_cycle === 'yearly' ? Math.round(price / 12) : price;
    }

    // 7) 에러 / 경고 / 결제 실패 (system_logs)
    let errorCount = 0;
    let warnCount = 0;
    let paymentFailures = 0;
    const eventCounter: Record<string, number> = {};
    try {
        const { data: logs } = await svc
            .from('system_logs')
            .select('level, event, area')
            .gte('created_at', startIso)
            .lt('created_at', endIso);
        for (const l of logs || []) {
            if ((l as any).level === 'error') errorCount++;
            else if ((l as any).level === 'warn') warnCount++;
            const ev = (l as any).event;
            eventCounter[ev] = (eventCounter[ev] || 0) + 1;
            if (ev?.includes('failed') || ev?.includes('cancelled') || ev?.includes('error')) {
                if ((l as any).area === 'billing' || (l as any).area === 'iap' || (l as any).area === 'kakaopay') {
                    paymentFailures++;
                }
            }
        }
    } catch { /* table may not exist yet */ }

    const topEvents = Object.entries(eventCounter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([event, count]) => ({ event, count }));

    return {
        range,
        acquisition: { new_signups: newSignups || 0 },
        activation: {
            users_with_first_analysis: usersWithFirstAnalysis,
            first_analysis_rate_pct: firstAnalysisRate,
        },
        engagement: {
            active_users: activeUsers,
            analyses_count: analysesCount || 0,
            pdf_exports: pdfExports,
        },
        conversion: {
            trials_started: trialsStarted,
            direct_paid: directPaid,
            trial_to_paid: trialToPaid,
            paid_total: paidTotal,
        },
        revenue: {
            gross_krw: grossKrw,
            by_provider: byProvider,
            coupon_redemptions: couponRedemptions,
        },
        retention_churn: {
            cancellations,
            churned_mrr_krw: churnedMrr,
        },
        errors: {
            error_count: errorCount,
            warn_count: warnCount,
            top_events: topEvents,
            payment_failures: paymentFailures,
        },
    };
}

function normalizeProvider(raw: unknown): string {
    const s = String(raw || '').toLowerCase();
    if (s.includes('apple') || s === 'ios') return 'apple_iap';
    if (s.includes('google') || s === 'android') return 'google_play';
    if (s.includes('kakao')) return 'kakaopay';
    if (s.includes('toss')) return 'tosspayments';
    if (s.includes('inicis')) return 'inicis';
    if (!s || s === 'card') return 'card';
    return s;
}

// ── 비교 delta 계산 ────────────────────────────────────

function pctDelta(curr: number, prev: number): number | null {
    if (prev === 0) return curr === 0 ? 0 : null; // 분모 0 → null (Infinity 회피)
    return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function buildDeltas(curr: PeriodMetrics, prev: PeriodMetrics): AggregatedMetrics['deltas'] {
    const pairs: Array<[string, number, number]> = [
        ['new_signups', curr.acquisition.new_signups, prev.acquisition.new_signups],
        ['users_with_first_analysis', curr.activation.users_with_first_analysis, prev.activation.users_with_first_analysis],
        ['active_users', curr.engagement.active_users, prev.engagement.active_users],
        ['analyses_count', curr.engagement.analyses_count, prev.engagement.analyses_count],
        ['trials_started', curr.conversion.trials_started, prev.conversion.trials_started],
        ['paid_total', curr.conversion.paid_total, prev.conversion.paid_total],
        ['gross_krw', curr.revenue.gross_krw, prev.revenue.gross_krw],
        ['cancellations', curr.retention_churn.cancellations, prev.retention_churn.cancellations],
        ['churned_mrr_krw', curr.retention_churn.churned_mrr_krw, prev.retention_churn.churned_mrr_krw],
        ['error_count', curr.errors.error_count, prev.errors.error_count],
        ['payment_failures', curr.errors.payment_failures, prev.errors.payment_failures],
    ];
    const out: AggregatedMetrics['deltas'] = {};
    for (const [key, c, p] of pairs) {
        out[key] = { current: c, previous: p, delta_pct: pctDelta(c, p) };
    }
    return out;
}

// ── Public API ───────────────────────────────────────

export async function aggregate(
    svc: SupabaseClient,
    periodType: PeriodType,
    asOf: Date = new Date(),
): Promise<AggregatedMetrics> {
    const ranges = computeRanges(periodType, asOf);
    const [current, previous] = await Promise.all([
        aggregatePeriod(svc, ranges.current),
        aggregatePeriod(svc, ranges.previous),
    ]);
    return {
        period_type: periodType,
        current,
        previous,
        deltas: buildDeltas(current, previous),
    };
}
