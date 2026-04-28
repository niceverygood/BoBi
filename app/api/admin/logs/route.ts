// app/api/admin/logs/route.ts
// 관리자 시스템 로그 조회.
// - system_logs 테이블에서 최근 이벤트 스트림 반환
// - area/level/event/user 필터 + 키워드 검색
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const area = url.searchParams.get('area');       // billing | iap | kakaopay | ...
    const level = url.searchParams.get('level');     // info | warn | error
    const event = url.searchParams.get('event');     // specific event name
    const search = url.searchParams.get('q');        // free-text search in message/email
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 1000);

    try {
        const serviceClient = await createServiceClient();

        let query = serviceClient
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (area && area !== 'all') query = query.eq('area', area);
        if (level && level !== 'all') query = query.eq('level', level);
        if (event) query = query.eq('event', event);
        if (search) {
            // message 또는 user_email 부분일치
            query = query.or(`message.ilike.%${search}%,user_email.ilike.%${search}%`);
        }

        const { data: logs, error } = await query;

        if (error) {
            // 테이블 없는 환경 대응
            return NextResponse.json({ logs: [], summary: {}, tableMissing: true, error: error.message });
        }

        // 레벨별 집계 (최근 24h)
        const summary: Record<string, number> = { info: 0, warn: 0, error: 0 };
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const l of logs || []) {
            if (new Date(l.created_at).getTime() < cutoff) continue;
            summary[l.level] = (summary[l.level] || 0) + 1;
        }

        return NextResponse.json({
            logs: logs || [],
            summary,
            total: logs?.length || 0,
        });
    } catch (error) {
        return NextResponse.json({ logs: [], summary: {}, error: (error as Error).message });
    }
}
