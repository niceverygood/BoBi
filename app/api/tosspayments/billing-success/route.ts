// app/api/tosspayments/billing-success/route.ts
// 토스페이먼츠 빌링키 발급 successUrl 콜백 (GET)
// 쿼리 파라미터: authKey, customerKey
//
// 처리:
//   1. customerKey로 pending 세션 복원 (user, plan, cycle, coupon, amount)
//   2. authKey로 빌링키 발급 (/v1/billing/authorizations/issue)
//   3. 쿠폰 재검증 + 금액 재계산 (보안)
//   4. 첫 결제 승인 (/v1/billing/{billingKey})
//   5. subscriptions + billing_keys 업서트
//   6. 브라우저를 subscribe?toss_status=success 로 리다이렉트

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { issueBillingKey, chargeBillingKey, generateOrderId } from '@/lib/tosspayments/server';
import { TRIAL_DAYS, computeTrialEndsAt, isTrialEligiblePlan } from '@/lib/subscription/trial';
import { getPlanPrice } from '@/lib/utils/pricing';

export const dynamic = 'force-dynamic';

function buildRedirect(origin: string, params: Record<string, string>): string {
    const qs = new URLSearchParams(params);
    return `${origin.replace(/\/$/, '')}/dashboard/subscribe?${qs.toString()}`;
}

export async function GET(request: Request) {
    const origin =
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.headers.get('origin') ||
        'https://www.bobi.co.kr';

    try {
        const url = new URL(request.url);
        const authKey = url.searchParams.get('authKey');
        const customerKey = url.searchParams.get('customerKey');

        if (!authKey || !customerKey) {
            return NextResponse.redirect(
                buildRedirect(origin, {
                    toss_status: 'failed',
                    code: 'missing_params',
                    msg: 'authKey 또는 customerKey가 없습니다.',
                }),
                { status: 303 },
            );
        }

        const svc = await createServiceClient();

        // 1. pending 세션 복원
        const { data: pending } = await svc
            .from('tosspayments_pending_billing')
            .select('*')
            .eq('customer_key', customerKey)
            .maybeSingle();

        if (!pending) {
            return NextResponse.redirect(
                buildRedirect(origin, {
                    toss_status: 'failed',
                    code: 'no_session',
                    msg: '결제 세션을 찾을 수 없습니다.',
                }),
                { status: 303 },
            );
        }

        // 2. 빌링키 발급
        const issueResult = await issueBillingKey({ authKey, customerKey });
        if (!issueResult.success || !issueResult.billingKey) {
            console.error('[toss/success] 빌링키 발급 실패:', issueResult);
            const { captureError } = await import('@/lib/monitoring/sentry-helpers');
            captureError(new Error(`TOSS 빌링키 발급 실패: ${issueResult.errorCode}`), {
                area: 'billing',
                level: 'error',
                tags: { provider: 'tosspayments_direct', stage: 'billing_key_issue' },
                metadata: {
                    errorCode: issueResult.errorCode,
                    errorMessage: issueResult.errorMessage?.slice(0, 200),
                    userId: pending.user_id,
                    planSlug: pending.plan_slug,
                },
            });
            return NextResponse.redirect(
                buildRedirect(origin, {
                    toss_status: 'failed',
                    code: issueResult.errorCode || 'issue_failed',
                    msg: (issueResult.errorMessage || '빌링키 발급 실패').slice(0, 200),
                }),
                { status: 303 },
            );
        }

        const billingKey = issueResult.billingKey;

        // 3. 플랜 + 쿠폰 재검증 (보안 — 클라이언트/pending에 의존하지 않고 재계산)
        const { data: plan } = await svc
            .from('subscription_plans')
            .select('*')
            .eq('slug', pending.plan_slug)
            .maybeSingle();
        if (!plan) {
            return NextResponse.redirect(
                buildRedirect(origin, { toss_status: 'failed', code: 'no_plan' }),
                { status: 303 },
            );
        }

        let amount = getPlanPrice(plan.slug, pending.billing_cycle);
        let actualPlan = plan;
        let validatedCouponId: string | null = null;

        if (pending.coupon_code) {
            const { data: coupon } = await svc
                .from('promo_codes')
                .select('*')
                .eq('code', pending.coupon_code)
                .eq('active', true)
                .maybeSingle();

            if (coupon) {
                const existing = await svc
                    .from('promo_code_redemptions')
                    .select('id')
                    .eq('promo_code_id', coupon.id)
                    .eq('user_id', pending.user_id)
                    .maybeSingle();

                if (!existing.data) {
                    validatedCouponId = coupon.id;
                    if (coupon.discount_type === 'percent') {
                        amount = Math.max(0, amount - Math.round((amount * Math.min(coupon.discount_value, 100)) / 100));
                    } else if (coupon.discount_type === 'fixed') {
                        amount = Math.max(0, amount - coupon.discount_value);
                    } else if (coupon.price_override !== null && coupon.price_override !== undefined) {
                        amount = Math.max(0, coupon.price_override);
                    }
                    if (pending.upgrade_plan_slug && coupon.upgrade_to_plan === pending.upgrade_plan_slug) {
                        const { data: upgradePlan } = await svc
                            .from('subscription_plans')
                            .select('*')
                            .eq('slug', pending.upgrade_plan_slug)
                            .maybeSingle();
                        if (upgradePlan) actualPlan = upgradePlan;
                    }
                }
            }
        }

        // 4. 체험 여부 판단 (pending.intent + 재자격 체크)
        const now = new Date();
        let isTrial = pending.intent === 'trial' && isTrialEligiblePlan(actualPlan.slug);
        if (isTrial) {
            // 이미 체험 이력이 있으면 체험 모드 해제 (중복 방지)
            const { data: history } = await svc
                .from('trial_history')
                .select('id')
                .eq('user_id', pending.user_id)
                .eq('plan_slug', actualPlan.slug)
                .maybeSingle();
            if (history) isTrial = false;
        }

        // 5. 첫 결제 승인 (체험 모드면 스킵 — 빌링키만 등록하고 cron이 체험 종료 시 자동 청구)
        const orderId = generateOrderId(`sub-${actualPlan.slug}`);
        const orderName = `보비 ${actualPlan.display_name} (${pending.billing_cycle === 'yearly' ? '연간' : '월간'})`;

        if (!isTrial && amount > 0) {
            const charge = await chargeBillingKey({
                billingKey,
                customerKey,
                amount,
                orderId,
                orderName,
                customerEmail: pending.buyer_email,
                customerName: pending.buyer_name,
            });

            if (!charge.success) {
                console.error('[toss/success] 첫 결제 실패:', charge);
                const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                captureError(new Error(`TOSS 첫 결제 실패: ${charge.errorCode}`), {
                    area: 'billing',
                    level: 'error',
                    tags: { provider: 'tosspayments_direct', stage: 'first_charge' },
                    metadata: {
                        errorCode: charge.errorCode,
                        errorMessage: charge.errorMessage?.slice(0, 200),
                        amount,
                        userId: pending.user_id,
                        planSlug: actualPlan.slug,
                    },
                });
                return NextResponse.redirect(
                    buildRedirect(origin, {
                        toss_status: 'payment_failed',
                        code: charge.errorCode || 'charge_failed',
                        msg: (charge.errorMessage || '첫 결제 실패').slice(0, 200),
                    }),
                    { status: 303 },
                );
            }
        }

        // 6. 구독 생성 — 체험 모드면 status='trialing' + trial_ends_at 설정
        const periodEnd = new Date(now);
        if (isTrial) {
            periodEnd.setDate(periodEnd.getDate() + TRIAL_DAYS);
        } else if (pending.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // 기존 active/trialing 구독 취소
        await svc
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: now.toISOString() })
            .eq('user_id', pending.user_id)
            .in('status', ['active', 'trialing']);

        const trialEndsAt = isTrial ? computeTrialEndsAt(now) : null;

        const { data: subscription, error: subError } = await svc
            .from('subscriptions')
            .insert({
                user_id: pending.user_id,
                plan_id: actualPlan.id,
                status: isTrial ? 'trialing' : 'active',
                billing_cycle: pending.billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                trial_ends_at: trialEndsAt,
                trial_used: isTrial,
                payment_provider: 'tosspayments_direct',
                payment_key: billingKey,
                coupon_code: pending.coupon_code || null,
            })
            .select()
            .single();

        if (subError) {
            console.error('[toss/success] 구독 생성 실패:', subError);
            return NextResponse.redirect(
                buildRedirect(origin, {
                    toss_status: 'sub_create_failed',
                    code: 'db_error',
                    msg: subError.message.slice(0, 200),
                }),
                { status: 303 },
            );
        }

        // billing_keys 업서트 (cron용)
        try {
            await svc.from('billing_keys').upsert(
                {
                    user_id: pending.user_id,
                    billing_key: billingKey,
                    provider: 'tosspayments_direct',
                    // customerKey 는 별도 저장 필요 — 현재 스키마에 없으면 billing_key에 prefix로 인코딩 OR 컬럼 추가 권장
                    // 임시: provider + billing_key 조합으로 결제 시 customerKey 재생성 불가하므로 기록 필요
                    // 해결: billing_keys에 customer_key 컬럼 추가 (마이그레이션 스크립트 참조)
                    created_at: now.toISOString(),
                },
                { onConflict: 'user_id' },
            );
            // customer_key 별도 저장 (billing_keys 확장 컬럼 없으면 subscriptions 메타에라도 저장 필요)
            // 여기서는 subscriptions.payment_key에 billingKey를 저장하고,
            // cron에서 customerKey를 재구성하지 않고 전용 컬럼을 사용하는 방식으로 갱신
            await svc
                .from('subscriptions')
                .update({ payment_key: billingKey })
                .eq('id', subscription.id);
        } catch (err) {
            console.warn('[toss/success] billing_keys 업서트 실패:', err);
        }

        // tosspayments_customer_keys 테이블에 customer_key 별도 저장 (cron에서 사용)
        try {
            await svc.from('tosspayments_customer_keys').upsert(
                {
                    user_id: pending.user_id,
                    customer_key: customerKey,
                    billing_key: billingKey,
                    updated_at: now.toISOString(),
                },
                { onConflict: 'user_id' },
            );
        } catch (err) {
            console.warn('[toss/success] customer_keys 저장 실패 (테이블 미존재 가능):', err);
        }

        // 체험 이력 기록
        if (isTrial) {
            try {
                await svc.from('trial_history').upsert(
                    {
                        user_id: pending.user_id,
                        plan_slug: actualPlan.slug,
                        started_at: now.toISOString(),
                        subscription_id: subscription.id,
                        converted: false,
                    },
                    { onConflict: 'user_id,plan_slug' },
                );
            } catch (err) {
                console.warn('[toss/success] trial_history 기록 실패:', err);
            }
        }

        // 쿠폰 사용 기록
        if (validatedCouponId) {
            try {
                await svc.from('promo_code_redemptions').insert({
                    promo_code_id: validatedCouponId,
                    user_id: pending.user_id,
                    subscription_id: subscription.id,
                });
                await svc.rpc('increment_coupon_use', { p_coupon_id: validatedCouponId });
            } catch {
                // non-critical
            }
        }

        // usage_tracking 갱신
        try {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const periodStart = `${year}-${month}-01`;
            const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
            const periodEndStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
            const newLimit = actualPlan.max_analyses === -1 ? 999999 : actualPlan.max_analyses;

            const { data: existingUsage } = await svc
                .from('usage_tracking')
                .select('id')
                .eq('user_id', pending.user_id)
                .eq('period_start', periodStart)
                .maybeSingle();

            if (existingUsage) {
                await svc.from('usage_tracking').update({ analyses_limit: newLimit }).eq('id', existingUsage.id);
            } else {
                await svc.from('usage_tracking').insert({
                    user_id: pending.user_id,
                    period_start: periodStart,
                    period_end: periodEndStr,
                    analyses_used: 0,
                    analyses_limit: newLimit,
                });
            }
        } catch (err) {
            console.warn('[toss/success] usage_tracking 업데이트 실패:', err);
        }

        // pending 정리
        try {
            await svc.from('tosspayments_pending_billing').delete().eq('customer_key', customerKey);
        } catch {
            // ignore
        }

        return NextResponse.redirect(
            buildRedirect(origin, {
                toss_status: 'success',
                plan: actualPlan.slug,
                ...(isTrial ? { trial: '1' } : {}),
            }),
            { status: 303 },
        );
    } catch (err) {
        console.error('[toss/success] 예외:', err);
        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
        captureError(err, {
            area: 'billing',
            level: 'error',
            tags: { provider: 'tosspayments_direct', stage: 'return_exception' },
        });
        return NextResponse.redirect(
            buildRedirect(origin, {
                toss_status: 'failed',
                code: 'exception',
                msg: (err as Error).message.slice(0, 200),
            }),
            { status: 303 },
        );
    }
}
