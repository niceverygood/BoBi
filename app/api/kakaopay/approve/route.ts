import { NextResponse, NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { kakaoPayApprove, kakaoPayCancel } from '@/lib/kakaopay/client';
import { computeTrialEndsAt, isTrialEligiblePlan, TRIAL_DAYS } from '@/lib/subscription/trial';

// 체험 모드에서 SID 발급용으로 청구한 임시 금액 (ready 라우트와 일치해야 함)
const TRIAL_MINI_CHARGE_AMOUNT = 100;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const pgToken = searchParams.get('pg_token');
    const partnerOrderId = searchParams.get('partner_order_id');
    const partnerUserId = searchParams.get('partner_user_id');

    if (!pgToken || !partnerOrderId || !partnerUserId) {
        return NextResponse.redirect(new URL('/dashboard/subscribe?status=fail&error=missing_params', request.url));
    }

    const serviceClient = await createServiceClient();

    try {
        // 세션에서 TID 및 플랜 정보 가져오기
        const { data: session, error: sessionError } = await serviceClient
            .from('kakaopay_sessions')
            .select('*')
            .eq('user_id', partnerUserId)
            .eq('partner_order_id', partnerOrderId)
            .single();

        if (sessionError || !session) {
            return NextResponse.redirect(new URL('/dashboard/subscribe?status=fail&error=session_not_found', request.url));
        }

        // 카카오페이 결제 승인
        const approveResponse = await kakaoPayApprove({
            tid: session.tid,
            partnerOrderId,
            partnerUserId,
            pgToken,
        });

        // SID 저장 (정기결제용 키 = 빌링키)
        const sid = approveResponse.sid;

        // Fetch plan info
        const { data: plan } = await serviceClient
            .from('subscription_plans')
            .select('*')
            .eq('slug', session.plan_slug)
            .single();

        if (!plan) {
            return NextResponse.redirect(new URL('/dashboard/subscribe?status=fail&error=plan_not_found', request.url));
        }

        // 업그레이드 플랜 처리
        let actualPlan = plan;
        if (session.upgrade_plan_slug && session.coupon_code) {
            const { data: coupon } = await serviceClient
                .from('promo_codes')
                .select('upgrade_to_plan, active')
                .eq('code', session.coupon_code.toUpperCase().trim())
                .eq('active', true)
                .single();

            if (coupon && coupon.upgrade_to_plan === session.upgrade_plan_slug) {
                const { data: upgradePlan } = await serviceClient
                    .from('subscription_plans')
                    .select('*')
                    .eq('slug', session.upgrade_plan_slug)
                    .single();

                if (upgradePlan) {
                    actualPlan = upgradePlan;
                }
            }
        }

        const now = new Date();

        // 체험 모드 판정 — ready에서 'trial'로 저장했고 자격 플랜이면 체험으로 진행
        const isTrial = session.intent === 'trial' && isTrialEligiblePlan(actualPlan.slug);

        // 체험이면 approve 직후 임시 100원을 즉시 환불 (실패해도 플로우는 지속 — 수동 대응 가능)
        if (isTrial) {
            try {
                await kakaoPayCancel({
                    tid: approveResponse.tid,
                    cancelAmount: TRIAL_MINI_CHARGE_AMOUNT,
                });
            } catch (cancelErr) {
                console.error('[kakaopay/approve] 체험 임시 결제 환불 실패:', cancelErr);
                try {
                    const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                    captureError(cancelErr as Error, {
                        area: 'billing',
                        level: 'error',
                        tags: { provider: 'kakaopay', stage: 'trial_mini_refund' },
                        metadata: {
                            userId: partnerUserId,
                            tid: approveResponse.tid,
                            planSlug: actualPlan.slug,
                        },
                    });
                } catch { /* ignore */ }
            }
        }

        // Calculate period
        //   - 체험: current_period_end = trial_ends_at (+3일)
        //   - 일반: 월/연 주기
        const periodEnd = new Date(now);
        if (isTrial) {
            periodEnd.setDate(periodEnd.getDate() + TRIAL_DAYS);
        } else if (session.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Cancel any existing active/trialing subscription
        await serviceClient
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: now.toISOString() })
            .eq('user_id', partnerUserId)
            .in('status', ['active', 'trialing']);

        const trialEndsAt = isTrial ? computeTrialEndsAt(now) : null;

        // Create new subscription
        //   - 체험: status='trialing', trial_ends_at 설정, trial_used=true
        //   - 일반: status='active'
        const { data: subscription } = await serviceClient
            .from('subscriptions')
            .insert({
                user_id: partnerUserId,
                plan_id: actualPlan.id,
                status: isTrial ? 'trialing' : 'active',
                billing_cycle: session.billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                payment_provider: 'kakaopay',
                payment_key: sid,
                trial_ends_at: trialEndsAt,
                trial_used: isTrial,
            })
            .select()
            .single();

        // Update usage tracking
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const periodEndUsage = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const { data: existingUsage } = await serviceClient
            .from('usage_tracking')
            .select('id')
            .eq('user_id', partnerUserId)
            .eq('period_start', periodStart)
            .maybeSingle();

        const newLimit = actualPlan.max_analyses === -1 ? 999999 : actualPlan.max_analyses;

        if (existingUsage) {
            await serviceClient
                .from('usage_tracking')
                .update({ analyses_limit: newLimit })
                .eq('id', existingUsage.id);
        } else {
            await serviceClient
                .from('usage_tracking')
                .insert({
                    user_id: partnerUserId,
                    period_start: periodStart,
                    period_end: periodEndUsage,
                    analyses_used: 0,
                    analyses_limit: newLimit,
                });
        }

        // Save billing key (SID)
        try {
            await serviceClient
                .from('billing_keys')
                .upsert({
                    user_id: partnerUserId,
                    billing_key: sid,
                    provider: 'kakaopay',
                    created_at: now.toISOString(),
                }, { onConflict: 'user_id' });
        } catch {
            // non-critical
        }

        // Record payment history
        //   - 체험: 100원 청구 → 즉시 환불된 상태이므로 'refunded' 기록
        //   - 일반: 'paid'
        try {
            await serviceClient
                .from('payment_history')
                .insert({
                    user_id: partnerUserId,
                    subscription_id: subscription?.id,
                    payment_id: approveResponse.tid,
                    amount: isTrial ? TRIAL_MINI_CHARGE_AMOUNT : session.amount,
                    status: isTrial ? 'refunded' : 'paid',
                    billing_cycle: session.billing_cycle,
                    plan_slug: session.plan_slug,
                });
        } catch {
            // non-critical
        }

        // 체험 이력 기록 (중복 체험 방지)
        if (isTrial) {
            try {
                await serviceClient
                    .from('trial_history')
                    .insert({
                        user_id: partnerUserId,
                        plan_slug: actualPlan.slug,
                        subscription_id: subscription?.id,
                        started_at: now.toISOString(),
                        converted: false,
                    });
            } catch {
                // non-critical (UNIQUE 제약 있을 수 있음)
            }
        }

        // 쿠폰 사용 기록
        if (session.coupon_code) {
            try {
                const { data: coupon } = await serviceClient
                    .from('promo_codes')
                    .select('id, used_count')
                    .eq('code', session.coupon_code.toUpperCase().trim())
                    .eq('active', true)
                    .single();
                if (coupon) {
                    await serviceClient
                        .from('promo_code_redemptions')
                        .insert({ promo_code_id: coupon.id, user_id: partnerUserId });
                    await serviceClient
                        .from('promo_codes')
                        .update({ used_count: (coupon.used_count || 0) + 1 })
                        .eq('id', coupon.id);
                }
            } catch {
                // non-critical
            }
        }

        // 세션 정리
        await serviceClient
            .from('kakaopay_sessions')
            .delete()
            .eq('user_id', partnerUserId);

        // 성공 시 구독 완료 페이지로 리다이렉트 (체험이면 trial=1 추가)
        const redirectParams = new URLSearchParams({
            status: 'success',
            plan: actualPlan.slug,
            ...(isTrial ? { trial: '1' } : {}),
        });
        return NextResponse.redirect(
            new URL(`/dashboard/subscribe?${redirectParams.toString()}`, request.url)
        );

    } catch (error) {
        const errorMsg = encodeURIComponent((error as Error).message);
        return NextResponse.redirect(
            new URL(`/dashboard/subscribe?status=fail&error=${errorMsg}`, request.url)
        );
    }
}
