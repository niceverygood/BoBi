// FCM 토큰 등록/갱신 API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { user_id, token, platform } = await req.json();

    if (!user_id || !token || !platform) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // upsert: 같은 토큰이면 updated_at만 갱신, 같은 유저+플랫폼이면 토큰 교체
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );

    if (error) {
      console.error('[FCM Register] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FCM Register] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
