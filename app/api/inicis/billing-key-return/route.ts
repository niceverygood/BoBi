// app/api/inicis/billing-key-return/route.ts
// KG이니시스 INIpay Standard가 BILLAUTH 결과를 POST로 보내는 엔드포인트
// 1) authToken + authUrl 수신
// 2) authUrl로 승인 요청하여 실제 billKey 획득
// 3) 첫 결제 실행 → 구독 생성
// 4) 브라우저를 결제 완료 페이지로 리다이렉트
//
// 인증: 공개 엔드포인트 (INIpay가 외부에서 호출하므로 유저 세션 없음)
//       대신 oid(orderNumber) → inicis_pending_billing_keys 조회로 세션 복원

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { approveBillingKeyIssue, chargeBillkey } from '@/lib/inicis/server';
import { getPlanPrice } from '@/lib/utils/pricing';

export const dynamic = 'force-dynamic';

async function parseFormOrJson(request: Request): Promise<Record<string, string>> {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        const j = (await request.json()) as Record<string, unknown>;
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(j)) out[k] = String(v ?? '');
        return out;
    }
    const form = await request.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) out[k] = String(v);
    return out;
}

function buildRedirect(origin: string, params: Record<string, string>): string {
    const qs = new URLSearchParams(params);
    return `${origin.replace(/\/$/, '')}/dashboard/subscribe?${qs.toString()}`;
}

export async function POST(request: Request) {
    const origin =
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.headers.get('origin') ||
        'https://www.bobi.co.kr';

    try {
        const fields = await parseFormOrJson(request);

        const resultCode = fields.resultCode;
        const resultMsg = fields.resultMsg || '';
        const mid = fields.mid;
        const orderNumber = fields.orderNumber; // = oid
        const authToken = fields.authToken;
        const authUrl = fields.authUrl;

        // 실패 케이스 — 사용자가 취소하거나 카드 인증 실패
        if (resultCode !== '0000' || !authToken || !authUrl || !orderNumber) {
            return NextResponse.redirect(
                buildRedirect(origin, {
                    inicis_status: 'failed',
                    code: resultCode || 'unknown',
                    msg: resultMsg.slice(0, 200),
                }),
                { status: 303 },
            );
        }

        // 세션 복원
        const svc = await createServiceClient();
        const { data: pending } = await svc
            .from('inicis_pending_billing_keys')
            .select('*')
            .eq('oid', orderNumber)
            .maybeSingle();

        if (!pending) {
            console.error('[inicis/return] pending 레코드 없음:', orderNumber);
            return NextResponse.redirect(
                buildRedirect(origin, {
                    inicis_status: 'failed',
                    code: 'no_session',
                    msg: '발급 세션을 찾을 수 없습니다.',
                }),
                { status: 303 },
            );
        }

        // Step 1: authUrl로 승인 요청 → 최종 빌링키 획득
        const approveResult = await approveBillingKeyIssue({
            authToken,
            authUrl,
            oid: orderNumber,
        });

        if (approveResult.resultCode !== '0000' || !approveResult.billKey) {
            console.error('[inicis/return] 빌링키 승인 실패:', approveResult);
            const { captureError } = await import('@/lib/monitoring/sentry-helpers');
            captureError(new Error(`INICIS 빌링키 승인 실패: ${approveResult.resultCode}`), {
                area: 'billing',
                level: 'error',
                tags: { provider: 'inicis_direct', stage: 'billing_key_approve' },
                metadata: {
                    resultCode: approveResult.resultCode,
                    resultMsg: approveResult.resultMsg?.slice(0, 200),
                    userId: pending.user_id,
                    planSlug: pending.plan_slug,
                },
            });
            return NextResponse.redirect(
                buildRedirect(origin, {
                    inicis_status: 'failed',
                    code: approveResult.resultCode,
                    msg: (approveResult.resultMsg || '빌링키 승인 실패').slice(0, 200),
                }),
                { status: 303 },
            );
        }

        const billKey = approveResult.billKey;

        // Step 2: 플랜 정보 조회 + 결제 금액 계산 + 쿠폰 처리
        const { data: plan } = await svc
            .from('subscription_plans')
            .select('*')
            .eq('slug', pending.plan_slug)
            .maybeSingle();

        if (!plan) {
            return NextResponse.redirect(
                buildRedirect(origin, { inicis_status: 'failed', code: 'no_plan' }),
                { status: 303 },
            );
        }

        let amount = getPlanPrice(plan.slug, pending.billing_cycle);

        // 쿠폰 재검증
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
                const alreadyUsed = await svc
                    .from('promo_code_redemptions')
                    .select('id')
                    .eq('promo_code_id', coupon.id)
                    .eq('user_id', pending.user_id)
                    .maybeSingle();
                if (!alreadyUsed.data) {
                    validatedCouponId = coupon.id;
                    if (coupon.discount_type === 'percent') {
                        amount = Math.max(0, amount - Math.round((amount * Math.min(coupon.discount_value, 100)) / 100));
                    } else if (coupon.discount_type === 'fixed') {
                        amount = Math.max(0, amount - coupon.discount_value);
                    } else if (coupon.price_override !== null && coupon.price_override !== undefined) {
                        amount = Math.max(0, coupon.price_override);
                    }
                    // 업그레이드 쿠폰
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

        // Step 3: 실제 결제 (INIAPI)
        if (amount <= 0) {
            // 0원이면 승인 스킵 (쿠폰 100% 할인)
        } else {
            const charge = await chargeBillkey({
                billKey,
                price: amount,
                goodName: `보비 ${actualPlan.display_name} (${pending.billing_cycle === 'yearly' ? '연간' : '월간'})`,
                buyerName: pending.buyer_name,
                buyerEmail: pending.buyer_email,
                buyerTel: pending.buyer_tel,
            });

            if (!charge.success) {
                console.error('[inicis/return] 첫 결제 실패:', charge);
                const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                captureError(new Error(`INICIS 첫 결제 실패: ${charge.resultCode}`), {
                    area: 'billing',
                    level: 'error',
                    tags: { provider: 'inicis_direct', stage: 'first_charge' },
                    metadata: {
                        resultCode: charge.resultCode,
                        resultMsg: charge.resultMsg?.slice(0, 200),
                        amount,
                        userId: pending.user_id,
                        planSlug: actualPlan.slug,
                    },
                });
                return NextResponse.redirect(
                    buildRedirect(origin, {
                        inicis_status: 'payment_failed',
                        code: charge.resultCode,
                        msg: charge.resultMsg.slice(0, 200),
                    }),
                    { status: 303 },
                );
            }
        }

        // Step 4: 구독 생성 / 업데이트
        const now = new Date();
        const periodEnd = new Date(now);
        if (pending.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // 기존 active 구독 취소
        await svc
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: now.toISOString() })
            .eq('user_id', pending.user_id)
            .eq('status', 'active');

        // 새 구독 생성
        const { data: subscription, error: subError } = await svc
            .from('subscriptions')
            .insert({
                user_id: pending.user_id,
                plan_id: actualPlan.id,
                status: 'active',
                billing_cycle: pending.billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                payment_provider: 'inicis_direct',
                payment_key: billKey,
                coupon_code: pending.coupon_code || null,
            })
            .select()
            .single();

        if (subError) {
            console.error('[inicis/return] 구독 생성 실패:', subError);
            return NextResponse.redirect(
                buildRedirect(origin, {
                    inicis_status: 'sub_create_failed',
                    code: 'db_error',
                }),
                { status: 303 },
            );
        }

        // billing_keys 저장 (cron에서 사용)
        try {
            await svc.from('billing_keys').upsert(
                {
                    user_id: pending.user_id,
                    billing_key: billKey,
                    provider: 'inicis_direct',
                    created_at: now.toISOString(),
                },
                { onConflict: 'user_id' },
            );
        } catch {
            // non-critical
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
            console.warn('[inicis/return] usage_tracking 업데이트 실패:', err);
        }

        // pending 레코드 삭제 (1회성)
        try {
            await svc.from('inicis_pending_billing_keys').delete().eq('oid', orderNumber);
        } catch {
            // ignore
        }

        // 성공 리다이렉트
        return NextResponse.redirect(
            buildRedirect(origin, {
                inicis_status: 'success',
                plan: actualPlan.slug,
            }),
            { status: 303 },
        );
    } catch (err) {
        console.error('[inicis/return] 처리 중 오류:', err);
        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
        captureError(err, {
            area: 'billing',
            level: 'error',
            tags: { provider: 'inicis_direct', stage: 'return_exception' },
        });
        return NextResponse.redirect(
            buildRedirect(origin, {
                inicis_status: 'failed',
                code: 'exception',
                msg: (err as Error).message.slice(0, 200),
            }),
            { status: 303 },
        );
    }
}
