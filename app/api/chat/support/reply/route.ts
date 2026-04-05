// app/api/chat/support/reply/route.ts
// 관리자가 상담 메시지에 답장 + 전체 세션 목록 조회
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

async function getAdminSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

async function checkAdminAccess() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let hasAccess = false;
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        hasAccess = true;
    } else {
        const { data: subAdmin } = await supabase
            .from('sub_admins')
            .select('id')
            .eq('email', user.email)
            .eq('active', true)
            .maybeSingle();
        if (subAdmin) hasAccess = true;
    }

    return hasAccess ? user : null;
}

export async function POST(request: Request) {
    try {
        const user = await checkAdminAccess();
        if (!user) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        const { sessionId, message } = await request.json();
        if (!sessionId || !message) {
            return NextResponse.json({ error: 'sessionId와 message가 필요합니다.' }, { status: 400 });
        }

        // service role로 INSERT (RLS 우회)
        const adminSupabase = await getAdminSupabase();
        const { data, error } = await adminSupabase
            .from('support_chats')
            .insert({
                session_id: sessionId,
                user_id: user.id,
                user_email: user.email,
                user_name: user.user_metadata?.name || '관리자',
                sender: 'admin',
                message,
            })
            .select()
            .single();

        if (error) {
            console.error('Admin reply error:', error);
            return NextResponse.json({ error: '답장 전송에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({ chat: data });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// GET: 전체 상담 세션 목록 (관리자용)
export async function GET() {
    try {
        const user = await checkAdminAccess();
        if (!user) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        // service role로 전체 조회 (RLS 우회)
        const adminSupabase = await getAdminSupabase();
        const { data } = await adminSupabase
            .from('support_chats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        // 세션별 그룹핑
        const sessionMap = new Map<string, {
            sessionId: string;
            userName: string;
            userEmail: string;
            lastMessage: string;
            lastSender: string;
            lastTime: string;
            messageCount: number;
            unread: boolean;
        }>();

        for (const msg of (data || [])) {
            if (!sessionMap.has(msg.session_id)) {
                sessionMap.set(msg.session_id, {
                    sessionId: msg.session_id,
                    userName: msg.sender === 'user' ? msg.user_name : '',
                    userEmail: msg.sender === 'user' ? msg.user_email : '',
                    lastMessage: msg.message,
                    lastSender: msg.sender,
                    lastTime: msg.created_at,
                    messageCount: 1,
                    unread: msg.sender === 'user',
                });
            } else {
                const s = sessionMap.get(msg.session_id)!;
                s.messageCount++;
                if (msg.sender === 'user') {
                    s.userName = msg.user_name;
                    s.userEmail = msg.user_email;
                }
            }
        }

        const sessions = [...sessionMap.values()].sort((a, b) =>
            new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
        );

        return NextResponse.json({ sessions });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
