// app/api/admin/insights/route.ts
// AI 분석 인사이트 — 총괄관리자 전용
// GET  ?period=daily|weekly        → 가장 최근 캐시된 인사이트 (없으면 null)
// POST { period_type, force? }     → 지금 분석 실행 → DB upsert → 결과 반환

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';
import { aggregate, computeRanges, type PeriodType } from '@/lib/ai/insights/aggregator';
import { analyzeInsights } from '@/lib/ai/insights/analyzer';
import { log } from '@/lib/monitoring/system-log';

async function requireSuperAdmin() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { ok: false, status: 401, message: '인증이 필요합니다.' as const };
    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return { ok: false, status: 403, message: '총괄관리자 권한이 필요합니다.' as const };
    }
    return { ok: true as const, user };
}

export async function GET(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const url = new URL(request.url);
    const period = (url.searchParams.get('period') as PeriodType) || 'daily';
    if (period !== 'daily' && period !== 'weekly') {
        return NextResponse.json({ error: 'period 는 daily 또는 weekly 여야 합니다.' }, { status: 400 });
    }

    try {
        const svc = await createServiceClient();
        const { data, error } = await svc
            .from('ai_insights')
            .select('*')
            .eq('period_type', period)
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ insight: null, tableMissing: true, error: error.message });
        }

        return NextResponse.json({ insight: data || null });
    } catch (error) {
        return NextResponse.json({ insight: null, error: (error as Error).message });
    }
}

export async function POST(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const period = (body.period_type as PeriodType) || 'daily';
    if (period !== 'daily' && period !== 'weekly') {
        return NextResponse.json({ error: 'period_type 는 daily 또는 weekly 여야 합니다.' }, { status: 400 });
    }

    const force = body.force === true;
    const svc = await createServiceClient();
    const ranges = computeRanges(period);

    // force=false 면 동일 기간의 캐시가 있는 경우 그대로 반환
    if (!force) {
        const { data: cached } = await svc
            .from('ai_insights')
            .select('*')
            .eq('period_type', period)
            .eq('period_start', ranges.current.start)
            .maybeSingle();
        if (cached) {
            return NextResponse.json({ insight: cached, cached: true });
        }
    }

    try {
        const metrics = await aggregate(svc, period);
        const result = await analyzeInsights(metrics);

        // upsert
        const { data: saved, error: saveError } = await svc
            .from('ai_insights')
            .upsert({
                period_type: period,
                period_start: ranges.current.start,
                period_end: ranges.current.end,
                metrics,
                insights: result.insights,
                model: result.model,
                input_tokens: result.inputTokens,
                output_tokens: result.outputTokens,
                generated_by: auth.user.id,
                generated_at: new Date().toISOString(),
            }, { onConflict: 'period_type,period_start' })
            .select()
            .single();

        if (saveError) {
            log.error('admin', 'insight_save_failed', {
                userId: auth.user.id,
                userEmail: auth.user.email,
                message: saveError.message,
                metadata: { period, periodStart: ranges.current.start },
            });
            // 저장 실패해도 분석 결과는 반환
            return NextResponse.json({
                insight: {
                    period_type: period,
                    period_start: ranges.current.start,
                    period_end: ranges.current.end,
                    metrics,
                    insights: result.insights,
                    model: result.model,
                    input_tokens: result.inputTokens,
                    output_tokens: result.outputTokens,
                    generated_at: new Date().toISOString(),
                },
                saveError: saveError.message,
                tableMissing: true,
            });
        }

        log.info('admin', 'insight_generated', {
            userId: auth.user.id,
            userEmail: auth.user.email,
            metadata: {
                period,
                periodStart: ranges.current.start,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                actionsCount: result.insights.recommended_actions?.length || 0,
            },
        });

        return NextResponse.json({ insight: saved, cached: false });
    } catch (error) {
        log.error('admin', 'insight_generation_failed', {
            userId: auth.user.id,
            userEmail: auth.user.email,
            message: (error as Error).message,
            metadata: { period },
        });
        return NextResponse.json(
            { error: '분석 실패: ' + (error as Error).message },
            { status: 500 },
        );
    }
}
