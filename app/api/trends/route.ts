import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 대시보드용: 오늘(또는 최신) 트렌드 데이터 조회
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const svc = await createServiceClient();

    // 최신 날짜의 트렌드 조회
    const { data, error } = await svc
        .from('search_trends')
        .select('*')
        .order('date', { ascending: false })
        .limit(8); // 4 연령 × 2 성별 = 최대 8개

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ trends: [], date: null });
    }

    // 같은 날짜 데이터만 필터
    const latestDate = data[0].date;
    const trends = data
        .filter(d => d.date === latestDate)
        .map(d => ({
            ageGroup: d.age_group,
            gender: d.gender,
            genderLabel: d.gender_label,
            topKeywords: d.top_keywords || [],
            fetchedAt: d.fetched_at,
        }));

    return NextResponse.json({ trends, date: latestDate });
}
