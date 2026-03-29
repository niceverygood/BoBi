// app/api/admin/promo-codes/route.ts
// 프로모 코드 CRUD — 총괄관리자 + 중간관리자 접근 가능
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

type AdminRole = 'super' | 'sub' | null;

async function getAdminRole(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ role: AdminRole; userId: string | null; email: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { role: null, userId: null, email: null };

    // 총괄관리자 체크
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return { role: 'super', userId: user.id, email: user.email };
    }

    // 중간관리자 체크
    const { data: subAdmin } = await supabase
        .from('sub_admins')
        .select('id, active')
        .eq('email', user.email || '')
        .eq('active', true)
        .maybeSingle();

    if (subAdmin) {
        return { role: 'sub', userId: user.id, email: user.email ?? null };
    }

    return { role: null, userId: null, email: null };
}

// 조회
export async function GET() {
    const supabase = await createClient();
    const { role, userId } = await getAdminRole(supabase);

    if (!role) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    let query = supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

    // 중간관리자는 본인이 만든 코드만 조회
    if (role === 'sub') {
        query = query.eq('created_by', userId!);
    }

    const { data: codes, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 사용 이력 (총괄: 전체, 중간: 본인 코드 관련만)
    let redemptionQuery = supabase
        .from('promo_code_redemptions')
        .select('*')
        .order('created_at', { ascending: false });

    if (role === 'sub' && codes) {
        const codeIds = codes.map(c => c.id);
        if (codeIds.length > 0) {
            redemptionQuery = redemptionQuery.in('promo_code_id', codeIds);
        } else {
            return NextResponse.json({ codes: [], redemptions: [] });
        }
    }

    const { data: redemptions } = await redemptionQuery;

    return NextResponse.json({ codes: codes || [], redemptions: redemptions || [] });
}

// 생성
export async function POST(request: Request) {
    const supabase = await createClient();
    const { role, userId } = await getAdminRole(supabase);

    if (!role || !userId) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, description, plan_slug, price_override, discount_type, discount_value, duration_months, max_uses, expires_at } = body;

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
            discount_type: discount_type || 'price_override',
            discount_value: discount_value ?? 0,
            duration_months: duration_months ?? -1,
            max_uses: max_uses ?? -1,
            expires_at: expires_at || null,
            created_by: userId,
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
    const { role, userId } = await getAdminRole(supabase);

    if (!role || !userId) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    // 중간관리자는 본인 코드만 수정 가능
    if (role === 'sub') {
        const { data: existing } = await supabase
            .from('promo_codes')
            .select('created_by')
            .eq('id', id)
            .single();

        if (!existing || existing.created_by !== userId) {
            return NextResponse.json({ error: '본인이 생성한 코드만 수정할 수 있습니다.' }, { status: 403 });
        }
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
    const { role, userId } = await getAdminRole(supabase);

    if (!role || !userId) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    // 중간관리자는 본인 코드만 삭제 가능
    if (role === 'sub') {
        const { data: existing } = await supabase
            .from('promo_codes')
            .select('created_by')
            .eq('id', id)
            .single();

        if (!existing || existing.created_by !== userId) {
            return NextResponse.json({ error: '본인이 생성한 코드만 삭제할 수 있습니다.' }, { status: 403 });
        }
    }

    const { error } = await supabase.from('promo_codes').delete().eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
