import { NextResponse } from 'next/server';

// 트렌드 수집 수동 트리거 (관리자용, 테스트 후 삭제 가능)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 내부적으로 cron 엔드포인트 호출
    const cronUrl = new URL('/api/cron/search-trends', request.url);
    const res = await fetch(cronUrl.toString(), {
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
    });

    const data = await res.json();
    return NextResponse.json(data);
}
