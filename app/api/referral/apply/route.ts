// app/api/referral/apply/route.ts
// 신규 가입자가 초대 코드를 자신에게 연결한다.
// 가입 직후 클라이언트가 sessionStorage에 저장된 ref_code로 호출.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyReferralCode } from '@/lib/referral/apply';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as { code?: string };
        const code = (body.code ?? '').trim();
        if (!code) {
            return NextResponse.json({ error: '초대 코드가 필요합니다.' }, { status: 400 });
        }

        const result = await applyReferralCode(supabase, user.id, code);
        if (!result.ok) {
            const messages: Record<string, string> = {
                invalid_code: '유효하지 않은 초대 코드입니다.',
                self_referral: '본인의 초대 코드는 사용할 수 없습니다.',
                already_applied: '이미 다른 코드로 적용되었습니다.',
                invitee_has_paid_history: '기존 결제 이력이 있어 초대 코드를 적용할 수 없습니다.',
            };
            return NextResponse.json(
                { error: messages[result.reason] ?? '적용 실패', reason: result.reason },
                { status: 400 },
            );
        }

        return NextResponse.json({ success: true, referralId: result.referralId });
    } catch (err) {
        console.error('[referral/apply] error:', err);
        return NextResponse.json(
            { error: (err as Error).message ?? '적용 실패' },
            { status: 500 },
        );
    }
}
