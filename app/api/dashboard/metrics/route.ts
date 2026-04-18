// app/api/dashboard/metrics/route.ts
// 대시보드 주간 KPI — 이번 주 vs 지난 주 비교
//
// 반환:
//   - analysesThisWeek / analysesLastWeek / analysesChange (%)
//   - newCustomersThisWeek / newCustomersLastWeek / ...
//   - futureMeThisWeek / futureMeLastWeek / ...
//   - conversionRate (analyses 중 future_me 생성 비율)

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface KpiValue {
    thisWeek: number;
    lastWeek: number;
    /** 퍼센트 증감. null = 지난 주 0건 → 계산 불가 */
    changePercent: number | null;
}

function kpiCalc(thisWeek: number, lastWeek: number): KpiValue {
    if (lastWeek === 0) {
        return { thisWeek, lastWeek, changePercent: thisWeek > 0 ? 100 : null };
    }
    const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    return { thisWeek, lastWeek, changePercent: change };
}

/** 주 시작일 (월요일 00:00) 반환 */
function getWeekStart(offset: number = 0): Date {
    const now = new Date();
    const day = now.getDay(); // 0(일) ~ 6(토)
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset - offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const svc = await createServiceClient();
        const thisWeekStart = getWeekStart(0);
        const lastWeekStart = getWeekStart(1);

        // 병렬로 모든 카운트 조회 (효율)
        const [
            analysesThis,
            analysesLast,
            customersThis,
            customersLast,
            futureMeThisRaw,
            futureMeLastRaw,
            riskReportThis,
            riskReportLast,
        ] = await Promise.all([
            svc.from('analyses').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', thisWeekStart.toISOString()),
            svc.from('analyses').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', lastWeekStart.toISOString()).lt('created_at', thisWeekStart.toISOString()),

            svc.from('customers').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', thisWeekStart.toISOString()),
            svc.from('customers').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', lastWeekStart.toISOString()).lt('created_at', thisWeekStart.toISOString()),

            // future_me_reports 테이블 (없으면 0)
            svc.from('future_me_reports').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', thisWeekStart.toISOString()),
            svc.from('future_me_reports').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).gte('created_at', lastWeekStart.toISOString()).lt('created_at', thisWeekStart.toISOString()),

            // 위험도 리포트는 analyses.risk_report 컬럼 기반
            svc.from('analyses').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .not('risk_report', 'is', null)
                .gte('updated_at', thisWeekStart.toISOString()),
            svc.from('analyses').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .not('risk_report', 'is', null)
                .gte('updated_at', lastWeekStart.toISOString()).lt('updated_at', thisWeekStart.toISOString()),
        ]);

        // 전환율: 이번 주 분석 건 중 future_me 생성 비율
        const analysesCount = analysesThis.count || 0;
        const futureMeCount = futureMeThisRaw.count || 0;
        const conversionRate = analysesCount > 0
            ? Math.round((futureMeCount / analysesCount) * 100)
            : 0;

        return NextResponse.json({
            analyses: kpiCalc(analysesThis.count || 0, analysesLast.count || 0),
            newCustomers: kpiCalc(customersThis.count || 0, customersLast.count || 0),
            futureMe: kpiCalc(futureMeThisRaw.count || 0, futureMeLastRaw.count || 0),
            riskReports: kpiCalc(riskReportThis.count || 0, riskReportLast.count || 0),
            conversionRate, // 이번 주 분석 대비 미래의나 생성률
            periodLabel: {
                thisWeekStart: thisWeekStart.toISOString(),
                lastWeekStart: lastWeekStart.toISOString(),
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || 'metrics 조회 실패' },
            { status: 500 },
        );
    }
}
