// app/api/chat/support/route.ts
// 상담사 연결: 메시지를 DB에 저장하여 관리자가 실시간으로 응대
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { message, sessionId } = await request.json();

        if (!message) {
            return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
        }

        // support_chats 테이블에 저장
        const { data, error } = await supabase
            .from('support_chats')
            .insert({
                session_id: sessionId || crypto.randomUUID(),
                user_id: user.id,
                user_email: user.email,
                user_name: user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
                sender: 'user',
                message,
            })
            .select()
            .single();

        if (error) {
            console.error('Support chat insert error:', error);
            return NextResponse.json({ error: '메시지 전송에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({ chat: data, sessionId: data.session_id });
    } catch (error) {
        console.error('Support error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// GET: 특정 세션의 메시지 조회
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            // 내 세션 목록 조회
            const { data } = await supabase
                .from('support_chats')
                .select('session_id, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const sessions = [...new Set((data || []).map(d => d.session_id))];
            return NextResponse.json({ sessions });
        }

        // 특정 세션 메시지 조회
        const { data } = await supabase
            .from('support_chats')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        return NextResponse.json({ messages: data || [] });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
