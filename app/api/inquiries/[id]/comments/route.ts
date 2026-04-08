import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

// 댓글 작성
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { content } = await request.json();
    if (!content?.trim()) {
        return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
    }

    const svc = await createServiceClient();

    // 관리자 여부 확인
    let isAdmin = false;
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        isAdmin = true;
    } else {
        const { data: subAdmin } = await svc
            .from('sub_admins')
            .select('id')
            .eq('email', user.email)
            .eq('active', true)
            .maybeSingle();
        if (subAdmin) isAdmin = true;
    }

    // 댓글 저장
    const { data, error } = await svc
        .from('inquiry_comments')
        .insert({
            inquiry_id: id,
            user_id: user.id,
            content: content.trim(),
            is_admin: isAdmin,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 관리자 댓글이면 문의 상태를 in_progress로 변경
    if (isAdmin) {
        await svc.from('inquiries').update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
        }).eq('id', id).eq('status', 'open');
    }

    return NextResponse.json({ comment: data });
}
