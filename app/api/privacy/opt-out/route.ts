import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 통계 활용 opt-out 상태 조회
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const { data } = await svc
        .from('statistics_opt_out')
        .select('opted_out_at, reason')
        .eq('user_id', user.id)
        .maybeSingle();

    return NextResponse.json({
        optedOut: !!data,
        optedOutAt: data?.opted_out_at || null,
    });
}

// opt-out 등록
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { reason } = await request.json().catch(() => ({ reason: '' }));
    const svc = await createServiceClient();

    const { error } = await svc.from('statistics_opt_out').upsert({
        user_id: user.id,
        reason: reason || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: '통계 활용 거부가 등록되었습니다.' });
}

// opt-out 해제
export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const { error } = await svc.from('statistics_opt_out').delete().eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: '통계 활용 동의가 복구되었습니다.' });
}
