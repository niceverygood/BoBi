// app/api/cron/trial-end/route.ts
// 매일 실행되는 cron:
//   - status='trialing' 이고 trial_ends_at <= now 인 구독 조회
//   - 각 구독에 대해 빌링키로 첫 결제 실행
//   - 성공: status='active', current_period_start/end 갱신, trial_history.converted=true
//   - 실패: status='past_due', Sentry 경고 + 추후 재시도

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { chargeBillingKey, generateOrderId } from '@/lib/tosspayments/server';
import { kakaoPaySubscription } from '@/lib/kakaopay/client';
import { getPlanPrice } from '@/lib/utils/pricing';
import { log } from '@/lib/monitoring/system-log';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Vercel Cron 인증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const now = new Date();
    const results = {
        processed: 0,
        charged: 0,
        failed: 0,
        skipped: 0,
        errors: [] as string[],
    };

    try {
        // 1. 만료된 체험 구독 조회
        const { data: expiredTrials, error: fetchError } = await svc
            .from('subscriptions')
            .select(`
                *,
                plan:subscription_plans(*)
            `)
            .eq('status', 'trialing')
            .lte('trial_ends_at', now.toISOString());

        if (fetchError) {
            throw new Error(`체험 구독 조회 실패: ${fetchError.message}`);
        }

        if (!expiredTrials || expiredTrials.length === 0) {
            return NextResponse.json({ message: '만료된 체험 구독이 없습니다.', ...results });
        }

        results.processed = expiredTrials.length;

        for (const sub of expiredTrials) {
            try {
                const plan = sub.plan;
                if (!plan) {
                    results.skipped++;
                    continue;
                }

                let amount: number;
                try {
                    amount = getPlanPrice(plan.slug, sub.billing_cycle);
                } catch {
                    // 알 수 없는 플랜 슬러그(레거시) — 결제 스킵
                    results.skipped++;
                    continue;
                }
                if (!amount || amount <= 0) {
                    results.skipped++;
                    continue;
                }

                // 2. Provider별 분기 — 토스페이먼츠 / 카카오페이 모두 체험 지원
                if (sub.payment_provider !== 'tosspayments_direct' && sub.payment_provider !== 'kakaopay') {
                    results.skipped++;
                    continue;
                }

                if (!sub.payment_key) {
                    results.failed++;
                    results.errors.push(`user=${sub.user_id}: billingKey/SID 누락`);
                    continue;
                }

                // buyer 정보 — profiles에서 best effort (토스 측 사용)
                const { data: profile } = await svc
                    .from('profiles')
                    .select('email, name')
                    .eq('id', sub.user_id)
                    .maybeSingle();

                // 3. Provider별 첫 결제 실행
                const orderId = generateOrderId(`trial-end-${plan.slug}`);
                const orderName = `보비 ${plan.display_name} (${sub.billing_cycle === 'yearly' ? '연간' : '월간'}) 체험 전환`;

                let chargeOk = false;
                let chargeErrorCode: string | undefined;
                let chargeErrorMessage: string | undefined;
                let chargePaymentId: string | undefined;

                if (sub.payment_provider === 'tosspayments_direct') {
                    const { data: ck } = await svc
                        .from('tosspayments_customer_keys')
                        .select('customer_key')
                        .eq('user_id', sub.user_id)
                        .maybeSingle();
                    const customerKey = ck?.customer_key;
                    if (!customerKey) {
                        results.failed++;
                        results.errors.push(`user=${sub.user_id}: customerKey 누락`);
                        continue;
                    }

                    const charge = await chargeBillingKey({
                        billingKey: sub.payment_key,
                        customerKey,
                        amount,
                        orderId,
                        orderName,
                        customerEmail: profile?.email,
                        customerName: profile?.name,
                    });
                    chargeOk = charge.success;
                    chargeErrorCode = charge.errorCode;
                    chargeErrorMessage = charge.errorMessage;
                } else {
                    // 카카오페이: SID로 정기결제 실행
                    try {
                        const resp = await kakaoPaySubscription({
                            sid: sub.payment_key,
                            partnerOrderId: orderId,
                            partnerUserId: sub.user_id,
                            itemName: orderName,
                            totalAmount: amount,
                        });
                        chargeOk = true;
                        chargePaymentId = resp.tid;
                    } catch (err) {
                        chargeOk = false;
                        chargeErrorCode = 'kakaopay_error';
                        chargeErrorMessage = (err as Error).message;
                    }
                }

                if (!chargeOk) {
                    // 결제 실패 → past_due
                    await svc
                        .from('subscriptions')
                        .update({
                            status: 'past_due',
                            updated_at: now.toISOString(),
                        })
                        .eq('id', sub.id);

                    results.failed++;
                    results.errors.push(
                        `user=${sub.user_id} (${plan.slug}, ${sub.payment_provider}): ${chargeErrorCode} ${chargeErrorMessage?.slice(0, 100) || ''}`,
                    );

                    try {
                        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                        captureError(new Error(`Trial charge failed: ${chargeErrorCode}`), {
                            area: 'billing',
                            level: 'warning',
                            tags: { stage: 'trial_end_charge', provider: sub.payment_provider },
                            metadata: {
                                userId: sub.user_id,
                                subscriptionId: sub.id,
                                planSlug: plan.slug,
                                errorCode: chargeErrorCode,
                                errorMessage: chargeErrorMessage?.slice(0, 200),
                            },
                        });
                    } catch {
                        // ignore
                    }
                    continue;
                }
                // 4. 결제 성공 → active 전환, period 갱신
                const periodStart = now.toISOString();
                const periodEnd = new Date(now);
                if (sub.billing_cycle === 'yearly') {
                    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                } else {
                    periodEnd.setMonth(periodEnd.getMonth() + 1);
                }

                await svc
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        current_period_start: periodStart,
                        current_period_end: periodEnd.toISOString(),
                        updated_at: now.toISOString(),
                    })
                    .eq('id', sub.id);

                // 5. 결제 기록 — 어드민 결제내역 + 환불 처리에 필요.
                //    payment_id 우선순위: 카카오페이 TID → 토스 orderId.
                const recordedPaymentId = chargePaymentId || orderId;
                const paymentMethod = sub.payment_provider === 'kakaopay' ? 'kakaopay' : 'tosspayments';

                try {
                    await svc
                        .from('payment_history')
                        .insert({
                            user_id: sub.user_id,
                            subscription_id: sub.id,
                            payment_id: recordedPaymentId,
                            amount,
                            status: 'paid',
                            billing_cycle: sub.billing_cycle,
                            plan_slug: plan.slug,
                        });
                } catch { /* non-critical */ }

                try {
                    await svc
                        .from('payments')
                        .insert({
                            user_id: sub.user_id,
                            subscription_id: sub.id,
                            payment_id: recordedPaymentId,
                            portone_payment_id: null,
                            amount,
                            status: 'paid',
                            billing_cycle: sub.billing_cycle,
                            plan_slug: plan.slug,
                            payment_method: paymentMethod,
                        });
                } catch { /* non-critical — payments 테이블 부재 시 */ }

                // 6. usage_tracking 갱신 — 체험 → 정기 전환 시 분석 한도를 새 플랜에 맞춤
                try {
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const usagePeriodStart = `${year}-${month}-01`;
                    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                    const usagePeriodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
                    const newLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

                    const { data: existingUsage } = await svc
                        .from('usage_tracking')
                        .select('id')
                        .eq('user_id', sub.user_id)
                        .eq('period_start', usagePeriodStart)
                        .maybeSingle();

                    if (existingUsage) {
                        await svc
                            .from('usage_tracking')
                            .update({ analyses_limit: newLimit })
                            .eq('id', existingUsage.id);
                    } else {
                        await svc
                            .from('usage_tracking')
                            .insert({
                                user_id: sub.user_id,
                                period_start: usagePeriodStart,
                                period_end: usagePeriodEnd,
                                analyses_used: 0,
                                analyses_limit: newLimit,
                            });
                    }
                } catch { /* non-critical */ }

                // 7. trial_history 전환 기록
                try {
                    await svc
                        .from('trial_history')
                        .update({ converted: true, ended_at: now.toISOString() })
                        .eq('user_id', sub.user_id)
                        .eq('plan_slug', plan.slug);
                } catch {
                    // non-critical
                }

                await log.info('billing', 'trial_end_charged', {
                    userId: sub.user_id,
                    message: `체험 → 정기 전환 결제 ${amount}원 (${paymentMethod})`,
                    metadata: {
                        subscriptionId: sub.id,
                        provider: sub.payment_provider,
                        planSlug: plan.slug,
                        billingCycle: sub.billing_cycle,
                        amount,
                        paymentId: recordedPaymentId,
                    },
                });

                results.charged++;
            } catch (err) {
                results.failed++;
                results.errors.push(`user=${sub.user_id}: ${(err as Error).message}`);
            }
        }

        return NextResponse.json({ message: '체험 만료 처리 완료', ...results });
    } catch (err) {
        console.error('[cron/trial-end] 예외:', err);
        return NextResponse.json(
            { error: (err as Error).message, ...results },
            { status: 500 },
        );
    }
}
