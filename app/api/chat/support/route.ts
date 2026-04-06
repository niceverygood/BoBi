// app/api/chat/support/route.ts
// 상담사 연결: 메시지를 DB에 저장 (service role 사용 — RLS 우회)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

async function getServiceSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

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

        const svcSupabase = await getServiceSupabase();
        const { data, error } = await svcSupabase
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

        // 관리자/중간관리자에게 푸시 알림 발송 (비동기, 실패해도 무시)
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || '고객';
        sendAdminPushNotification(svcSupabase, userName, message).catch(() => {});

        return NextResponse.json({ chat: data, sessionId: data.session_id });
    } catch (error) {
        console.error('Support error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        const svcSupabase = await getServiceSupabase();

        if (!sessionId) {
            const { data } = await svcSupabase
                .from('support_chats')
                .select('session_id, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const sessions = [...new Set((data || []).map(d => d.session_id))];
            return NextResponse.json({ sessions });
        }

        const { data } = await svcSupabase
            .from('support_chats')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        return NextResponse.json({ messages: data || [] });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// 관리자/중간관리자에게 푸시 알림
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendAdminPushNotification(svcSupabase: any, userName: string, message: string) {
    try {
        // 관리자 이메일로 user_id 조회
        const { data: adminUsers } = await svcSupabase.auth.admin.listUsers({ perPage: 500 });
        const adminIds: string[] = [];

        for (const u of adminUsers?.users || []) {
            if (u.email && (ADMIN_EMAILS as readonly string[]).includes(u.email)) {
                adminIds.push(u.id);
            }
        }

        // 중간관리자도 추가
        const { data: subAdmins } = await svcSupabase
            .from('sub_admins')
            .select('email')
            .eq('active', true);

        for (const sa of subAdmins || []) {
            const admin = adminUsers?.users?.find((u: any) => u.email === sa.email);
            if (admin && !adminIds.includes(admin.id)) {
                adminIds.push(admin.id);
            }
        }

        if (adminIds.length === 0) return;

        // FCM 토큰 조회
        const { data: tokens } = await svcSupabase
            .from('fcm_tokens')
            .select('token')
            .in('user_id', adminIds);

        if (!tokens?.length) return;

        // FCM 발송
        const { getFirebaseMessaging } = await import('@/lib/firebase-admin');
        const messaging = await getFirebaseMessaging();

        const tokenList = tokens.map((t: any) => t.token);
        await messaging.sendEachForMulticast({
            tokens: tokenList,
            notification: {
                title: `💬 새 상담 메시지 — ${userName}`,
                body: message.substring(0, 100),
            },
            data: { type: 'support_chat', url: '/admin/support' },
        });

        console.log(`[Push] 관리자 ${adminIds.length}명에게 상담 알림 발송`);
    } catch (err) {
        console.error('[Push] 관리자 알림 실패:', err);
    }
}
