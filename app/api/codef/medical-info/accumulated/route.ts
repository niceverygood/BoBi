// app/api/codef/medical-info/accumulated/route.ts
// 누적 진료기록 조회 — user_medical_records에 저장된 1년 윈도우들을 합쳐 반환.
// UI는 이 결과로 "현재 X / 5년 수집됨", "다음 추가 인증할 윈도우" 를 계산한다.
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface AccumulatedRow {
    record_type: 'medical' | 'car_insurance' | 'medicine';
    period_start: string;
    period_end: string;
    record_count: number;
    fetched_at: string;
    records: unknown[];
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const { data, error } = await svc
        .from('user_medical_records')
        .select('record_type, period_start, period_end, record_count, fetched_at, records')
        .eq('user_id', user.id)
        .order('period_end', { ascending: false });

    if (error) {
        // 테이블이 아직 마이그레이션되지 않은 환경에서는 빈 배열로 응답 — UI가 fallback 처리
        if (error.code === '42P01' || error.message?.includes('user_medical_records')) {
            return NextResponse.json({ tableMissing: true, windows: [], merged: { medical: [], car_insurance: [], medicine: [] } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as AccumulatedRow[];

    // type별 records 병합 (period_end 내림차순으로 이미 정렬돼 있음 — 최근 윈도우 먼저)
    const merged: Record<'medical' | 'car_insurance' | 'medicine', unknown[]> = {
        medical: [],
        car_insurance: [],
        medicine: [],
    };
    for (const row of rows) {
        merged[row.record_type] = [...merged[row.record_type], ...(row.records || [])];
    }

    // UI에 보여줄 윈도우 메타 (records는 무거우니 제외)
    const windows = rows.map(r => ({
        record_type: r.record_type,
        period_start: r.period_start,
        period_end: r.period_end,
        record_count: r.record_count,
        fetched_at: r.fetched_at,
    }));

    return NextResponse.json({
        windows,
        merged: {
            medical: merged.medical,
            car_insurance: merged.car_insurance,
            medicine: merged.medicine,
        },
        counts: {
            medical: merged.medical.length,
            car_insurance: merged.car_insurance.length,
            medicine: merged.medicine.length,
        },
    });
}
