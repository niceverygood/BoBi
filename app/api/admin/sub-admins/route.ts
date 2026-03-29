// app/api/admin/sub-admins/route.ts
// 중간관리자 관리 API (총괄관리자 전용)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

async function isSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ? (ADMIN_EMAILS as readonly string[]).includes(user.email) : false;
}

// 조회: 중간관리자 목록
export async function GET() {
    const supabase = await createClient();
    if (!(await isSuperAdmin(supabase))) {
        return NextResponse.json({ error: '총괄관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { data, error } = await supabase
        .from('sub_admins')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subAdmins: data || [] });
}

// 추가: 중간관리자 등록
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isSuperAdmin(supabase))) {
        return NextResponse.json({ error: '총괄관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, kakao_id, name, note } = body;

    if (!email) {
        return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('sub_admins')
        .insert({
            email: email.toLowerCase().trim(),
            kakao_id: kakao_id || null,
            name: name || null,
            note: note || '',
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: '이미 등록된 중간관리자입니다.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subAdmin: data });
}

// 수정: 활성/비활성 토글
export async function PUT(request: Request) {
    const supabase = await createClient();
    if (!(await isSuperAdmin(supabase))) {
        return NextResponse.json({ error: '총괄관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
        .from('sub_admins')
        .update({ active })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// 삭제
export async function DELETE(request: Request) {
    const supabase = await createClient();
    if (!(await isSuperAdmin(supabase))) {
        return NextResponse.json({ error: '총괄관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('sub_admins').delete().eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
