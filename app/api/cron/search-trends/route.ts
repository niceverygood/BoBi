import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchAllTrends } from '@/lib/naver/trend';

// Vercel Cron — 매일 오전 7시(KST) = UTC 22:00 전날
export async function GET(request: Request) {
    // Cron 인증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[SearchTrends] 트렌드 수집 시작...');

        const trends = await fetchAllTrends();

        // Supabase에 저장
        const svc = await createServiceClient();
        const today = new Date().toISOString().split('T')[0];

        // 오늘 데이터가 이미 있으면 삭제 후 재생성
        await svc.from('search_trends').delete().eq('date', today);

        const rows = trends.map(t => ({
            date: today,
            age_group: t.ageLabel,
            gender: t.gender,
            gender_label: t.genderLabel,
            top_keywords: t.topKeywords,
            fetched_at: t.fetchedAt,
        }));

        const { error } = await svc.from('search_trends').insert(rows);

        if (error) {
            console.error('[SearchTrends] DB 저장 실패:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[SearchTrends] ${rows.length}개 그룹 저장 완료`);
        return NextResponse.json({
            success: true,
            groups: rows.length,
            date: today,
        });
    } catch (error) {
        console.error('[SearchTrends] 에러:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
