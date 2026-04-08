import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 문의 상세 조회
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const svc = await createServiceClient();

    const { data: inquiry, error } = await svc
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !inquiry) return NextResponse.json({ error: '문의를 찾을 수 없습니다.' }, { status: 404 });

    // 댓글 조회
    const { data: comments } = await svc
        .from('inquiry_comments')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true });

    // 댓글 작성자 정보
    const commentUserIds = [...new Set((comments || []).map(c => c.user_id))];
    const allUserIds = [...new Set([inquiry.user_id, ...commentUserIds])];
    const { data: profiles } = await svc.from('profiles').select('id, email, name').in('id', allUserIds);
    const userMap = new Map((profiles || []).map(p => [p.id, { email: p.email, name: p.name }]));

    const enrichedComments = (comments || []).map(c => ({
        ...c,
        author_name: userMap.get(c.user_id)?.name || userMap.get(c.user_id)?.email?.split('@')[0] || '-',
        is_admin: c.is_admin || false,
    }));

    return NextResponse.json({
        inquiry: {
            ...inquiry,
            user_email: userMap.get(inquiry.user_id)?.email || '-',
            user_name: userMap.get(inquiry.user_id)?.name || '-',
        },
        comments: enrichedComments,
    });
}

// 문의 상태 변경 (관리자)
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const body = await _req.json();
    const { status } = body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
    }

    const svc = await createServiceClient();

    const { error } = await svc
        .from('inquiries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
