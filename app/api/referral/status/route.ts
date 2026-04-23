// app/api/referral/status/route.ts
// 인바이터(현재 로그인 사용자)의 리퍼럴 현황 + 초대 코드 조회.
// 베이직 이상 유료 사용자만 호출 가능 (무료는 403).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPlan } from '@/lib/subscription/access';
import { getReferralStatus } from '@/lib/referral/status';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        // 무료 사용자는 초대 기능 사용 불가
        const plan = await getUserPlan(supabase, user.id);
        if (!plan || plan.slug === 'free') {
            return NextResponse.json(
                {
                    error: '친구 초대 기능은 베이직 플랜 이상에서 이용 가능합니다.',
                    requiresPlan: 'basic',
                },
                { status: 403 },
            );
        }

        const status = await getReferralStatus(supabase, user.id);
        return NextResponse.json(status);
    } catch (err) {
        console.error('[referral/status] error:', err);
        return NextResponse.json(
            { error: (err as Error).message ?? '조회 실패' },
            { status: 500 },
        );
    }
}
