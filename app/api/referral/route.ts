// app/api/referral/route.ts
// 친구초대 시스템: 초대 코드 생성, 초대 코드 사용, 초대 현황 조회
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_REFERRALS = 10; // 최대 초대 가능 수
const REWARD_DAYS = 7;   // 초대 1건당 베이직 무료 일수

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // 내 초대 코드 조회 (없으면 생성)
        let { data: referral } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', user.id)
            .single();

        if (!referral) {
            // 초대 코드 생성: BOBI-XXXX 형태
            const code = `BOBI-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const { data: newReferral, error } = await supabase
                .from('referrals')
                .insert({ referrer_id: user.id, code })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: '초대 코드 생성 실패' }, { status: 500 });
            }
            referral = newReferral;
        }

        // 초대한 친구 목록
        const { data: invitees } = await supabase
            .from('referral_uses')
            .select('invitee_email, created_at')
            .eq('referral_code', referral.code)
            .order('created_at', { ascending: false });

        const usedCount = invitees?.length || 0;
        const rewardMonths = Math.min(usedCount, MAX_REFERRALS);
        const remainingSlots = MAX_REFERRALS - usedCount;

        return NextResponse.json({
            code: referral.code,
            usedCount,
            rewardMonths,
            remainingSlots,
            maxReferrals: MAX_REFERRALS,
            invitees: invitees || [],
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// 초대 코드 사용 (신규 가입 시)
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { code } = await request.json();
        if (!code) return NextResponse.json({ error: '초대 코드를 입력해주세요.' }, { status: 400 });

        const normalizedCode = code.trim().toUpperCase();

        // 초대 코드 유효성 확인
        const { data: referral } = await supabase
            .from('referrals')
            .select('*')
            .eq('code', normalizedCode)
            .single();

        if (!referral) {
            return NextResponse.json({ error: '유효하지 않은 초대 코드입니다.' }, { status: 400 });
        }

        // 자기 자신의 코드 사용 불가
        if (referral.referrer_id === user.id) {
            return NextResponse.json({ error: '본인의 초대 코드는 사용할 수 없습니다.' }, { status: 400 });
        }

        // 이미 사용한 적 있는지 확인
        const { data: existing } = await supabase
            .from('referral_uses')
            .select('id')
            .eq('invitee_id', user.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: '이미 초대 코드를 사용하셨습니다.' }, { status: 400 });
        }

        // 초대자의 사용 횟수 확인
        const { count } = await supabase
            .from('referral_uses')
            .select('id', { count: 'exact', head: true })
            .eq('referral_code', normalizedCode);

        if ((count || 0) >= MAX_REFERRALS) {
            return NextResponse.json({ error: '이 초대 코드는 최대 사용 횟수에 도달했습니다.' }, { status: 400 });
        }

        // 초대 코드 사용 기록
        const { error: useError } = await supabase
            .from('referral_uses')
            .insert({
                referral_code: normalizedCode,
                referrer_id: referral.referrer_id,
                invitee_id: user.id,
                invitee_email: user.email,
            });

        if (useError) {
            return NextResponse.json({ error: '초대 코드 적용 실패' }, { status: 500 });
        }

        // 초대자에게 베이직 플랜 1개월 보상 적용
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
            const { createClient: createAdminClient } = await import('@supabase/supabase-js');
            const adminSupabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

            // 기존 구독 확인
            const { data: existingSub } = await adminSupabase
                .from('subscriptions')
                .select('*, plan:subscription_plans(slug)')
                .eq('user_id', referral.referrer_id)
                .eq('status', 'active')
                .maybeSingle();

            // 베이직 플랜 ID 조회
            const { data: basicPlan } = await adminSupabase
                .from('subscription_plans')
                .select('id')
                .eq('slug', 'basic')
                .single();

            if (basicPlan) {
                const now = new Date();
                // 기존 구독이 있으면 만료일 연장, 없으면 새로 생성
                const currentEnd = existingSub?.current_period_end
                    ? new Date(existingSub.current_period_end)
                    : now;
                const startDate = currentEnd > now ? currentEnd : now;
                const newEnd = new Date(startDate);
                newEnd.setDate(newEnd.getDate() + REWARD_DAYS);

                if (existingSub) {
                    await adminSupabase
                        .from('subscriptions')
                        .update({
                            plan_id: basicPlan.id,
                            current_period_end: newEnd.toISOString(),
                            payment_method: 'referral',
                        })
                        .eq('id', existingSub.id);
                } else {
                    await adminSupabase
                        .from('subscriptions')
                        .insert({
                            user_id: referral.referrer_id,
                            plan_id: basicPlan.id,
                            status: 'active',
                            current_period_start: now.toISOString(),
                            current_period_end: newEnd.toISOString(),
                            billing_cycle: 'monthly',
                            payment_method: 'referral',
                        });
                }
            }
        }

        return NextResponse.json({
            message: '초대 코드가 적용되었습니다! 초대한 분에게 베이직 플랜 1개월이 제공됩니다.',
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
