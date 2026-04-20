// app/api/cron/trial-end/route.ts
// 매일 실행되는 cron:
//   - status='trialing' 이고 trial_ends_at <= now 인 구독 조회
//   - 각 구독에 대해 빌링키로 첫 결제 실행
//   - 성공: status='active', current_period_start/end 갱신, trial_history.converted=true
//   - 실패: status='past_due', Sentry 경고 + 추후 재시도

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { chargeBillingKey, generateOrderId } from '@/lib/tosspayments/server';

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

                const amount = sub.billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                if (!amount || amount <= 0) {
                    results.skipped++;
                    continue;
                }

                // 2. Provider별 분기 (현재는 토스페이먼츠만 체험 지원)
                if (sub.payment_provider !== 'tosspayments_direct') {
                    results.skipped++;
                    continue;
                }

                // customerKey 조회
                const { data: ck } = await svc
                    .from('tosspayments_customer_keys')
                    .select('customer_key')
                    .eq('user_id', sub.user_id)
                    .maybeSingle();
                const customerKey = ck?.customer_key;
                if (!customerKey || !sub.payment_key) {
                    results.failed++;
                    results.errors.push(`user=${sub.user_id}: customerKey 또는 billingKey 누락`);
                    continue;
                }

                // buyer 정보 — profiles에서 best effort
                const { data: profile } = await svc
                    .from('profiles')
                    .select('email, name')
                    .eq('id', sub.user_id)
                    .maybeSingle();

                // 3. 첫 결제 실행
                const orderId = generateOrderId(`trial-end-${plan.slug}`);
                const orderName = `보비 ${plan.display_name} (${sub.billing_cycle === 'yearly' ? '연간' : '월간'}) 체험 전환`;

                const charge = await chargeBillingKey({
                    billingKey: sub.payment_key,
                    customerKey,
                    amount,
                    orderId,
                    orderName,
                    customerEmail: profile?.email,
                    customerName: profile?.name,
                });

                if (!charge.success) {
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
                        `user=${sub.user_id} (${plan.slug}): ${charge.errorCode} ${charge.errorMessage?.slice(0, 100) || ''}`,
                    );

                    try {
                        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                        captureError(new Error(`Trial charge failed: ${charge.errorCode}`), {
                            area: 'billing',
                            level: 'warning',
                            tags: { stage: 'trial_end_charge', provider: 'tosspayments_direct' },
                            metadata: {
                                userId: sub.user_id,
                                subscriptionId: sub.id,
                                planSlug: plan.slug,
                                errorCode: charge.errorCode,
                                errorMessage: charge.errorMessage?.slice(0, 200),
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

                // trial_history 전환 기록
                try {
                    await svc
                        .from('trial_history')
                        .update({ converted: true, ended_at: now.toISOString() })
                        .eq('user_id', sub.user_id)
                        .eq('plan_slug', plan.slug);
                } catch {
                    // non-critical
                }

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
