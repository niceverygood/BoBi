// app/api/dashboard/activity/route.ts
// 최근 30일 일별 분석 건수 — 대시보드 미니 차트용

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface ActivityDay {
    /** YYYY-MM-DD */
    date: string;
    analyses: number;
    futureMe: number;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const svc = await createServiceClient();

        // 30일 전 날짜
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);

        // 병렬 조회
        const [analysesRes, futureMeRes] = await Promise.all([
            svc.from('analyses')
                .select('created_at')
                .eq('user_id', user.id)
                .gte('created_at', start.toISOString()),
            svc.from('future_me_reports')
                .select('created_at')
                .eq('user_id', user.id)
                .gte('created_at', start.toISOString()),
        ]);

        // 날짜별 집계
        const buckets = new Map<string, { analyses: number; futureMe: number }>();
        for (let i = 0; i <= 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            buckets.set(key, { analyses: 0, futureMe: 0 });
        }

        for (const row of analysesRes.data || []) {
            const key = new Date(row.created_at).toISOString().slice(0, 10);
            const b = buckets.get(key);
            if (b) b.analyses += 1;
        }
        for (const row of futureMeRes.data || []) {
            const key = new Date(row.created_at).toISOString().slice(0, 10);
            const b = buckets.get(key);
            if (b) b.futureMe += 1;
        }

        const days: ActivityDay[] = Array.from(buckets.entries())
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 연속 접속일(streak) 계산 — 분석 또는 future_me가 있는 날
        let streak = 0;
        for (let i = days.length - 1; i >= 0; i--) {
            const d = days[i];
            if (d.analyses > 0 || d.futureMe > 0) streak += 1;
            else break;
        }

        // 가장 활발한 요일 (0=일 ~ 6=토)
        const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
        for (const d of days) {
            const dow = new Date(d.date).getDay();
            weekdayTotals[dow] += d.analyses + d.futureMe;
        }
        const peakWeekdayIdx = weekdayTotals.indexOf(Math.max(...weekdayTotals));
        const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

        return NextResponse.json({
            days,
            streak,
            peakWeekday: weekdayTotals[peakWeekdayIdx] > 0 ? weekdayNames[peakWeekdayIdx] : null,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || 'activity 조회 실패' },
            { status: 500 },
        );
    }
}
