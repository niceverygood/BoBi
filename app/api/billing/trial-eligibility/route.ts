// app/api/billing/trial-eligibility/route.ts
// GET /api/billing/trial-eligibility?plan=basic
// 현재 로그인 사용자가 해당 플랜의 3일 무료 체험을 받을 수 있는지 확인.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkTrialEligibility, TRIAL_DAYS } from '@/lib/subscription/trial';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const url = new URL(request.url);
        const planSlug = url.searchParams.get('plan') || 'basic';

        const result = await checkTrialEligibility(supabase, user?.id ?? null, planSlug);

        return NextResponse.json({
            ...result,
            trialDays: TRIAL_DAYS,
            planSlug,
        });
    } catch (err) {
        return NextResponse.json(
            { eligible: false, error: (err as Error).message },
            { status: 500 },
        );
    }
}
