// app/api/referral/validate-code/route.ts
// 가입 화면에서 입력된 초대 코드가 유효한지 미리 검증.
// 인증 불필요. rate limiting은 추후 필요 시 추가.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lookupInviterByCode } from '@/lib/referral/code';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = (searchParams.get('code') ?? '').trim();
        if (!code) {
            return NextResponse.json({ valid: false, reason: 'missing_code' });
        }

        const supabase = await createClient();
        const inviterId = await lookupInviterByCode(supabase, code);
        if (!inviterId) {
            return NextResponse.json({ valid: false, reason: 'not_found' });
        }

        return NextResponse.json({ valid: true });
    } catch (err) {
        console.error('[referral/validate-code] error:', err);
        return NextResponse.json(
            { valid: false, reason: 'internal_error', error: (err as Error).message },
            { status: 500 },
        );
    }
}
