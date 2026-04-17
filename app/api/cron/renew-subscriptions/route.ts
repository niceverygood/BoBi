import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { payWithBillingKey } from '@/lib/portone/server';
import { kakaoPaySubscription } from '@/lib/kakaopay/client';

// Vercel Cron에서 호출 — CRON_SECRET으로 인증
export async function GET(request: Request) {
    // Vercel Cron 인증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();
    const now = new Date();
    const results = { renewed: 0, failed: 0, pastDue: 0, errors: [] as string[] };

    try {
        // 1. 갱신 대상 조회: 만료된 active 구독 (빌링키 없는 provider 제외)
        const { data: expiredSubs, error: fetchError } = await supabase
            .from('subscriptions')
            .select(`
                *,
                plan:subscription_plans(*)
            `)
            .eq('status', 'active')
            .neq('payment_provider', 'admin_manual')
            .neq('payment_provider', 'coupon_free')
            .neq('payment_provider', 'promo_code')
            .neq('payment_provider', 'discount_code')
            .neq('payment_provider', 'apple_iap')
            .neq('payment_provider', 'google_play')
            .lt('current_period_end', now.toISOString());

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!expiredSubs || expiredSubs.length === 0) {
            return NextResponse.json({ message: '갱신 대상 없음', results });
        }

        // 2. 각 구독에 대해 자동 결제 시도
        for (const sub of expiredSubs) {
            try {
                const plan = sub.plan as any;
                if (!plan) {
                    results.errors.push(`구독 ${sub.id}: 플랜 정보 없음`);
                    results.failed++;
                    continue;
                }

                // 빌링키 조회
                const { data: billingKeyData } = await supabase
                    .from('billing_keys')
                    .select('billing_key, provider')
                    .eq('user_id', sub.user_id)
                    .maybeSingle();

                if (!billingKeyData?.billing_key) {
                    // 빌링키 없으면 → 구독의 payment_key 사용 (폴백)
                    if (!sub.payment_key) {
                        results.errors.push(`구독 ${sub.id}: 빌링키 없음`);
                        await markPastDue(supabase, sub.id);
                        results.pastDue++;
                        continue;
                    }
                }

                const billingKey = billingKeyData?.billing_key || sub.payment_key;

                // 결제 금액 계산
                const amount = sub.billing_cycle === 'yearly'
                    ? plan.price_yearly
                    : plan.price_monthly;

                if (!amount || amount <= 0) {
                    results.errors.push(`구독 ${sub.id}: 결제 금액 0원`);
                    results.failed++;
                    continue;
                }

                // 결제 실행: provider에 따라 분기
                const provider = billingKeyData?.provider || sub.payment_provider || 'portone';
                const paymentId = `renewal-${sub.id}-${Date.now()}`;
                const cycleLabel = sub.billing_cycle === 'yearly' ? '연간' : '월간';

                let paySuccess = false;
                let payError = '';
                let newSid: string | undefined;

                if (provider === 'kakaopay') {
                    // 카카오페이 SID로 정기결제
                    try {
                        const kakaoResult = await kakaoPaySubscription({
                            sid: billingKey,
                            partnerOrderId: paymentId,
                            partnerUserId: sub.user_id,
                            itemName: `보비 ${plan.display_name} (${cycleLabel} 자동갱신)`,
                            totalAmount: amount,
                        });
                        paySuccess = true;
                        newSid = kakaoResult.sid; // 갱신된 SID
                    } catch (err) {
                        payError = (err as Error).message;
                    }
                } else {
                    // 포트원 빌링키 결제 — provider별 채널키 선택
                    const channelKey = provider === 'portone_inicis'
                        ? process.env.NEXT_PUBLIC_PORTONE_INICIS_BILLING_CHANNEL_KEY
                        : undefined;

                    const payResult = await payWithBillingKey({
                        billingKey,
                        paymentId,
                        orderName: `보비 ${plan.display_name} (${cycleLabel} 자동갱신)`,
                        amount,
                        channelKey,
                        customer: { id: sub.user_id },
                    });
                    paySuccess = payResult.success;
                    payError = payResult.error || '';
                }

                if (paySuccess) {
                    // 결제 성공 → 구독 기간 연장
                    const newPeriodStart = new Date(sub.current_period_end);
                    const newPeriodEnd = new Date(newPeriodStart);

                    if (sub.billing_cycle === 'yearly') {
                        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
                    } else {
                        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
                    }

                    const updateData: Record<string, string> = {
                        current_period_start: newPeriodStart.toISOString(),
                        current_period_end: newPeriodEnd.toISOString(),
                        status: 'active',
                        updated_at: now.toISOString(),
                    };
                    // 카카오페이 SID 갱신
                    if (newSid) {
                        updateData.payment_key = newSid;
                    }

                    await supabase
                        .from('subscriptions')
                        .update(updateData)
                        .eq('id', sub.id);

                    // SID 갱신 시 billing_keys도 업데이트
                    if (newSid) {
                        try {
                            await supabase
                                .from('billing_keys')
                                .upsert({
                                    user_id: sub.user_id,
                                    billing_key: newSid,
                                    provider: 'kakaopay',
                                    created_at: now.toISOString(),
                                }, { onConflict: 'user_id' });
                        } catch {
                            // non-critical
                        }
                    }

                    // usage_tracking 갱신 (새 월 기준)
                    await resetUsageForNewPeriod(supabase, sub.user_id, plan.max_analyses);

                    // 결제 기록 저장
                    try {
                        await supabase
                            .from('payment_history')
                            .insert({
                                user_id: sub.user_id,
                                subscription_id: sub.id,
                                payment_id: paymentId,
                                amount,
                                status: 'paid',
                                billing_cycle: sub.billing_cycle,
                                plan_slug: plan.slug,
                            });
                    } catch {
                        // payment_history 테이블 없으면 무시
                    }

                    results.renewed++;
                } else {
                    // 결제 실패
                    results.errors.push(`구독 ${sub.id}: ${payError}`);

                    // 첫 실패 → past_due로 전환 (다음 cron에서 재시도)
                    await markPastDue(supabase, sub.id);
                    results.pastDue++;
                }
            } catch (err) {
                results.errors.push(`구독 ${sub.id}: ${(err as Error).message}`);
                results.failed++;
            }
        }

        // 3. past_due 상태 구독 재시도
        const { data: pastDueSubs } = await supabase
            .from('subscriptions')
            .select(`*, plan:subscription_plans(*)`)
            .eq('status', 'past_due');

        if (pastDueSubs) {
            for (const sub of pastDueSubs) {
                const periodEnd = new Date(sub.current_period_end);
                const daysSinceExpiry = (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSinceExpiry > 3) {
                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'cancelled',
                            cancelled_at: now.toISOString(),
                            updated_at: now.toISOString(),
                        })
                        .eq('id', sub.id);
                    results.errors.push(`구독 ${sub.id}: 3일 결제 실패 → 자동 취소`);
                    continue;
                }

                // 3일 이내: 결제 재시도
                try {
                    const plan = sub.plan as { price_monthly: number; price_yearly: number; slug: string; display_name: string; max_analyses: number } | null;
                    if (!plan) continue;

                    const { data: billingKeyData } = await supabase
                        .from('billing_keys')
                        .select('billing_key, provider')
                        .eq('user_id', sub.user_id)
                        .maybeSingle();

                    const bk = billingKeyData?.billing_key || sub.payment_key;
                    if (!bk) continue;

                    const retryAmount = sub.billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                    if (!retryAmount || retryAmount <= 0) continue;

                    const provider = billingKeyData?.provider || sub.payment_provider || 'portone';
                    const retryPaymentId = `retry-${sub.id}-${Date.now()}`;
                    const cycleLabel = sub.billing_cycle === 'yearly' ? '연간' : '월간';
                    let retrySuccess = false;
                    let retryNewSid: string | undefined;

                    if (provider === 'kakaopay') {
                        try {
                            const kakaoResult = await kakaoPaySubscription({
                                sid: bk,
                                partnerOrderId: retryPaymentId,
                                partnerUserId: sub.user_id,
                                itemName: `보비 ${plan.display_name} (${cycleLabel} 재시도)`,
                                totalAmount: retryAmount,
                            });
                            retrySuccess = true;
                            retryNewSid = kakaoResult.sid;
                        } catch { /* retry failed */ }
                    } else {
                        const retryChannelKey = provider === 'portone_inicis'
                            ? process.env.NEXT_PUBLIC_PORTONE_INICIS_BILLING_CHANNEL_KEY
                            : undefined;
                        const retryResult = await payWithBillingKey({
                            billingKey: bk,
                            paymentId: retryPaymentId,
                            orderName: `보비 ${plan.display_name} (${cycleLabel} 재시도)`,
                            amount: retryAmount,
                            channelKey: retryChannelKey,
                            customer: { id: sub.user_id },
                        });
                        retrySuccess = retryResult.success;
                    }

                    if (retrySuccess) {
                        const newPeriodStart = new Date(sub.current_period_end);
                        const newPeriodEnd = new Date(newPeriodStart);
                        if (sub.billing_cycle === 'yearly') {
                            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
                        } else {
                            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
                        }
                        const updateData: Record<string, string> = {
                            current_period_start: newPeriodStart.toISOString(),
                            current_period_end: newPeriodEnd.toISOString(),
                            status: 'active',
                            updated_at: now.toISOString(),
                        };
                        if (retryNewSid) updateData.payment_key = retryNewSid;

                        await supabase.from('subscriptions').update(updateData).eq('id', sub.id);
                        if (retryNewSid) {
                            try {
                                await supabase.from('billing_keys').upsert({
                                    user_id: sub.user_id, billing_key: retryNewSid,
                                    provider: 'kakaopay', created_at: now.toISOString(),
                                }, { onConflict: 'user_id' });
                            } catch { /* non-critical */ }
                        }
                        await resetUsageForNewPeriod(supabase, sub.user_id, plan.max_analyses);
                        results.renewed++;
                    }
                } catch {
                    // retry failed, will try again next cron
                }
            }
        }

        return NextResponse.json({
            message: `갱신 완료: ${results.renewed}건 성공, ${results.pastDue}건 결제실패, ${results.failed}건 오류`,
            results,
            processedAt: now.toISOString(),
        });
    } catch (error) {
        console.error('Cron renewal error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// past_due 상태로 전환
async function markPastDue(supabase: any, subscriptionId: string) {
    await supabase
        .from('subscriptions')
        .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);
}

// 새 기간에 대한 usage_tracking 리셋
async function resetUsageForNewPeriod(supabase: any, userId: string, maxAnalyses: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const newLimit = maxAnalyses === -1 ? 999999 : maxAnalyses;

    const { data: existing } = await supabase
        .from('usage_tracking')
        .select('id')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('usage_tracking')
            .update({ analyses_limit: newLimit })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('usage_tracking')
            .insert({
                user_id: userId,
                period_start: periodStart,
                period_end: periodEnd,
                analyses_used: 0,
                analyses_limit: newLimit,
            });
    }
}
