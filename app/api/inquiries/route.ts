import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 문의 목록 조회 (유저: 본인 것만, 관리자: 전체)
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    const svc = await createServiceClient();

    if (isAdmin) {
        // 관리자: 전체 문의 조회
        const { data, error } = await svc
            .from('inquiries')
            .select('*, comments:inquiry_comments(count)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // user_id → email 매핑
        const userIds = [...new Set((data || []).map(d => d.user_id))];
        const { data: profiles } = await svc.from('profiles').select('id, email, name').in('id', userIds);
        const userMap = new Map((profiles || []).map(p => [p.id, { email: p.email, name: p.name }]));

        const enriched = (data || []).map(d => ({
            ...d,
            user_email: userMap.get(d.user_id)?.email || '-',
            user_name: userMap.get(d.user_id)?.name || '-',
            comment_count: d.comments?.[0]?.count || 0,
        }));

        return NextResponse.json({ inquiries: enriched });
    }

    // 유저: 본인 문의만
    const { data, error } = await svc
        .from('inquiries')
        .select('*, comments:inquiry_comments(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = (data || []).map(d => ({
        ...d,
        comment_count: d.comments?.[0]?.count || 0,
    }));

    return NextResponse.json({ inquiries: items });
}

// 문의 작성
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { title, content, category } = await request.json();
    if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    const svc = await createServiceClient();

    const { data, error } = await svc
        .from('inquiries')
        .insert({
            user_id: user.id,
            title: title.trim(),
            content: content.trim(),
            category: category || '일반',
            status: 'open',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ inquiry: data });
}
