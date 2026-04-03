// app/api/admin/suspend-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

// suspend_type: 'shadow' = 쉐도우밴 (본인 모름), 'official' = 공식 정지 (고지), null = 정상
type SuspendType = 'shadow' | 'official' | null;

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

    const { targetUserId, suspendType, reason } = await request.json() as {
        targetUserId: string;
        suspendType: SuspendType;
        reason?: string;
    };

    if (!targetUserId) {
        return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
    }

    const validTypes: SuspendType[] = ['shadow', 'official', null];
    if (!validTypes.includes(suspendType)) {
        return NextResponse.json({ error: '유효하지 않은 정지 유형입니다.' }, { status: 400 });
    }

    if (targetUserId === user.id) {
        return NextResponse.json({ error: '자기 자신의 계정을 정지할 수 없습니다.' }, { status: 400 });
    }

    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            return NextResponse.json({ error: 'SERVICE_ROLE_KEY 미설정' }, { status: 500 });
        }
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
        );

        const isSuspending = suspendType !== null;

        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            targetUserId,
            {
                user_metadata: {
                    suspended: isSuspending,
                    suspend_type: suspendType, // 'shadow' | 'official' | null
                    suspended_at: isSuspending ? new Date().toISOString() : null,
                    suspended_by: isSuspending ? user.email : null,
                    suspended_reason: isSuspending ? (reason || '관리자에 의한 이용정지') : null,
                },
            },
        );

        if (updateError) {
            console.error('Suspend user error:', updateError);
            return NextResponse.json({ error: '유저 상태 변경에 실패했습니다.' }, { status: 500 });
        }

        const labels: Record<string, string> = {
            shadow: '쉐도우 정지',
            official: '공식 정지',
        };

        return NextResponse.json({
            message: isSuspending
                ? `유저가 ${labels[suspendType!]} 처리되었습니다.`
                : '유저의 정지가 해제되었습니다.',
            suspendType,
        });
    } catch (error) {
        console.error('Admin suspend error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
