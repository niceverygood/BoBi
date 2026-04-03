// app/api/admin/suspend-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Admin or Sub-Admin check
    let hasAccess = false;
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        hasAccess = true;
    } else {
        const { data: subAdmin } = await supabase
            .from('sub_admins')
            .select('id')
            .eq('email', user.email)
            .eq('active', true)
            .maybeSingle();
        if (subAdmin) hasAccess = true;
    }

    if (!hasAccess) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { targetUserId, suspended, reason } = await request.json();

    if (!targetUserId || typeof suspended !== 'boolean') {
        return NextResponse.json({ error: '유저 ID와 정지 여부를 입력해주세요.' }, { status: 400 });
    }

    // 자기 자신은 정지 불가
    if (targetUserId === user.id) {
        return NextResponse.json({ error: '자기 자신의 계정을 정지할 수 없습니다.' }, { status: 400 });
    }

    try {
        // Service role로 user_metadata 업데이트 (RLS 우회)
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            return NextResponse.json({ error: 'SERVICE_ROLE_KEY 미설정' }, { status: 500 });
        }
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
        );

        // auth.users의 user_metadata에 suspended 플래그 설정
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            targetUserId,
            {
                user_metadata: {
                    suspended,
                    suspended_at: suspended ? new Date().toISOString() : null,
                    suspended_by: suspended ? user.email : null,
                    suspended_reason: suspended ? (reason || '관리자에 의한 이용정지') : null,
                },
            },
        );

        if (updateError) {
            console.error('Suspend user error:', updateError);
            return NextResponse.json({ error: '유저 상태 변경에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            message: suspended
                ? `유저가 이용정지 처리되었습니다.`
                : `유저의 이용정지가 해제되었습니다.`,
            suspended,
        });
    } catch (error) {
        console.error('Admin suspend error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
