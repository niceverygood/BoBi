import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ? (ADMIN_EMAILS as readonly string[]).includes(user.email) : false;
}

// 조회
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin(supabase, user.id))) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { data: codes, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 코드의 사용 이력도 가져오기
    const { data: redemptions } = await supabase
        .from('promo_code_redemptions')
        .select('*, user:auth.users(email)')
        .order('created_at', { ascending: false });

    return NextResponse.json({ codes: codes || [], redemptions: redemptions || [] });
}

// 생성
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin(supabase, user.id))) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, description, plan_slug, price_override, duration_months, max_uses, expires_at } = body;

    if (!code || !plan_slug) {
        return NextResponse.json({ error: '코드와 플랜을 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('promo_codes')
        .insert({
            code: code.toUpperCase().trim(),
            description: description || '',
            plan_slug,
            price_override: price_override ?? 0,
            duration_months: duration_months ?? 3,
            max_uses: max_uses ?? -1,
            expires_at: expires_at || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: '이미 존재하는 코드입니다.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, code: data });
}

// 수정
export async function PUT(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin(supabase, user.id))) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
        .from('promo_codes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// 삭제
export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin(supabase, user.id))) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('promo_codes').delete().eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
