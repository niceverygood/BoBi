// 푸시 알림 발송 API (관리자 또는 서버 내부 호출용)
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

const ADMIN_EMAILS = [
  'dev@bottlecorp.kr',
  'admin@bobi.kr',
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // 인증 확인 (관리자 또는 CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');

    if (cronSecret === process.env.CRON_SECRET) {
      // 서버 내부 호출 허용
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, title, body, data } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }

    // 대상 토큰 조회
    let query = supabase.from('fcm_tokens').select('token');
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    const { data: tokens, error } = await query;

    if (error || !tokens?.length) {
      return NextResponse.json({ error: 'No tokens found' }, { status: 404 });
    }

    const messaging = await getFirebaseMessaging();

    // 멀티캐스트 발송
    const tokenList = tokens.map((t) => t.token);
    const response = await messaging.sendEachForMulticast({
      tokens: tokenList,
      notification: { title, body },
      data: data || {},
    });

    // 실패한 토큰 정리 (만료/무효)
    const failedTokens: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.responses.forEach((res: any, i: number) => {
      if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
        failedTokens.push(tokenList[i]);
      }
    });

    if (failedTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', failedTokens);
    }

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (err) {
    console.error('[FCM Send] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
