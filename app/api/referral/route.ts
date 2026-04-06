// app/api/referral/route.ts
// 친구초대: 초대자 7일 무료 / 피초대자 3일 무료 / 최대 5명
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_REFERRALS = 5;
const REFERRER_REWARD_DAYS = 7;  // 초대자 보상
const INVITEE_REWARD_DAYS = 3;   // 피초대자 보상

async function getAdminSupabase() {
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sk) return null;
    const { createClient: c } = await import('@supabase/supabase-js');
    return c(process.env.NEXT_PUBLIC_SUPABASE_URL!, sk);
}

async function grantFreeDays(adminSupabase: any, userId: string, days: number) {
    try {
        const { data: basicPlan } = await adminSupabase
            .from('subscription_plans').select('id').eq('slug', 'basic').single();

        if (!basicPlan) {
            console.error('[Referral] basic 플랜을 찾을 수 없습니다');
            return null;
        }

        console.log('[Referral] basicPlan:', basicPlan.id, 'userId:', userId, 'days:', days);

        const { data: existingSub, error: subErr } = await adminSupabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (subErr) console.error('[Referral] 기존 구독 조회 에러:', subErr);

        const now = new Date();
        const currentEnd = existingSub?.current_period_end ? new Date(existingSub.current_period_end) : now;
        const startDate = currentEnd > now ? currentEnd : now;
        const newEnd = new Date(startDate);
        newEnd.setDate(newEnd.getDate() + days);

        if (existingSub) {
            const { error: updateErr } = await adminSupabase.from('subscriptions').update({
                plan_id: basicPlan.id,
                current_period_end: newEnd.toISOString(),
            }).eq('id', existingSub.id);

            if (updateErr) console.error('[Referral] 구독 업데이트 에러:', updateErr);
            else console.log('[Referral] 구독 연장 완료:', newEnd.toISOString());
        } else {
            // 테이블 컬럼에 맞게 최소 필드만
            const insertData: Record<string, unknown> = {
                user_id: userId,
                plan_id: basicPlan.id,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: newEnd.toISOString(),
            };

            // 선택적 필드 — 컬럼이 있을 때만
            const { error: insertErr } = await adminSupabase
                .from('subscriptions').insert(insertData);

            if (insertErr) {
                console.error('[Referral] 구독 생성 에러:', insertErr);
                // billing_cycle 등 필수 컬럼 있으면 추가해서 재시도
                insertData.billing_cycle = 'monthly';
                insertData.payment_method = 'referral';
                const { error: retryErr } = await adminSupabase
                    .from('subscriptions').insert(insertData);
                if (retryErr) console.error('[Referral] 구독 재생성 에러:', retryErr);
                else console.log('[Referral] 구독 생성 완료 (재시도):', newEnd.toISOString());
            } else {
                console.log('[Referral] 구독 생성 완료:', newEnd.toISOString());
            }
        }
        return newEnd;
    } catch (err) {
        console.error('[Referral] grantFreeDays 에러:', err);
        return null;
    }
}

// GET: 내 초대 현황 + 무료 이용기간
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // 내 초대 코드
        let { data: referral } = await supabase
            .from('referrals').select('*').eq('referrer_id', user.id).single();

        const generateCode = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
            return code;
        };

        if (!referral) {
            // 새로 생성
            const code = generateCode();
            const { data: nr, error } = await supabase
                .from('referrals').insert({ referrer_id: user.id, code }).select().single();
            if (error) return NextResponse.json({ error: '초대 코드 생성 실패' }, { status: 500 });
            referral = nr;
        } else if (referral.code.includes('-') || referral.code.length !== 7) {
            // 기존 형태(BOBI-XXXX 등) → 새 형태로 자동 변경
            const newCode = generateCode();
            await supabase
                .from('referrals')
                .update({ code: newCode })
                .eq('id', referral.id);
            // referral_uses에서도 코드 업데이트 (기존 초대 기록 유지)
            await supabase
                .from('referral_uses')
                .update({ referral_code: newCode })
                .eq('referral_code', referral.code);
            referral.code = newCode;
        }

        // 초대한 친구 목록
        const { data: invitees } = await supabase
            .from('referral_uses').select('invitee_email, created_at')
            .eq('referral_code', referral.code).order('created_at', { ascending: false });

        const usedCount = invitees?.length || 0;
        const totalFreeDays = Math.min(usedCount, MAX_REFERRALS) * REFERRER_REWARD_DAYS;
        const remainingSlots = Math.max(0, MAX_REFERRALS - usedCount);

        // 내 구독 만료일 (무료 이용기간 확인용)
        const { data: mySub } = await supabase
            .from('subscriptions').select('current_period_end, payment_method')
            .eq('user_id', user.id).eq('status', 'active').maybeSingle();

        const freeUntil = mySub?.current_period_end || null;
        const isReferralSub = mySub?.payment_method === 'referral';

        return NextResponse.json({
            code: referral.code,
            usedCount,
            totalFreeDays,
            remainingSlots,
            maxReferrals: MAX_REFERRALS,
            rewardPerInvite: REFERRER_REWARD_DAYS,
            invitees: invitees || [],
            freeUntil,
            isReferralSub,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// POST: 초대 코드 사용
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { code } = await request.json();
        if (!code) return NextResponse.json({ error: '초대 코드를 입력해주세요.' }, { status: 400 });

        const normalizedCode = code.trim().toUpperCase();

        const { data: referral } = await supabase
            .from('referrals').select('*').eq('code', normalizedCode).single();

        if (!referral) return NextResponse.json({ error: '유효하지 않은 초대 코드입니다.' }, { status: 400 });
        if (referral.referrer_id === user.id) return NextResponse.json({ error: '본인의 초대 코드는 사용할 수 없습니다.' }, { status: 400 });

        const { data: existing } = await supabase
            .from('referral_uses').select('id').eq('invitee_id', user.id).maybeSingle();
        if (existing) return NextResponse.json({ error: '이미 초대 코드를 사용하셨습니다.' }, { status: 400 });

        const { count } = await supabase
            .from('referral_uses').select('id', { count: 'exact', head: true })
            .eq('referral_code', normalizedCode);
        if ((count || 0) >= MAX_REFERRALS) return NextResponse.json({ error: '이 초대 코드는 최대 사용 횟수(5명)에 도달했습니다.' }, { status: 400 });

        // 사용 기록 저장
        const { error: useError } = await supabase
            .from('referral_uses').insert({
                referral_code: normalizedCode,
                referrer_id: referral.referrer_id,
                invitee_id: user.id,
                invitee_email: user.email,
            });
        if (useError) return NextResponse.json({ error: '초대 코드 적용 실패' }, { status: 500 });

        const adminSupabase = await getAdminSupabase();
        if (adminSupabase) {
            // 초대자에게 7일 무료
            await grantFreeDays(adminSupabase, referral.referrer_id, REFERRER_REWARD_DAYS);
            // 피초대자에게 3일 무료
            await grantFreeDays(adminSupabase, user.id, INVITEE_REWARD_DAYS);
        }

        return NextResponse.json({
            message: `초대 코드가 적용되었습니다! 베이직 플랜 ${INVITEE_REWARD_DAYS}일 무료 이용이 시작됩니다. 초대한 분에게는 ${REFERRER_REWARD_DAYS}일이 추가됩니다.`,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
