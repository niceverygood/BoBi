// app/api/admin/recover-payment/route.ts
// 결제는 PG/스토어 측에서 발생했으나 우리 DB에 sync가 누락된 케이스를 운영자가 수동 복구.
//
// 실제 사례:
//   - 카카오페이: ready 후 approve 콜백이 도달하지 못해 SID는 발급됐는데 우리 DB에 없는 경우
//                 운영자가 카카오 가맹점 어드민에서 SID/TID를 확보 후 이 API로 복구
//   - Apple/Google IAP: 영수증 검증 단계에서 실패해 구독이 생성되지 않은 경우
//                       운영자가 사용자로부터 영수증/transactionId를 받아 이 API로 복구
//
// 모든 변경은 system_logs에 기록되어 추적 가능.

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';
import { log } from '@/lib/monitoring/system-log';
import { getPlanPrice } from '@/lib/utils/pricing';

type Provider = 'kakaopay' | 'apple_iap' | 'google_play';
type BillingCycle = 'monthly' | 'yearly';

interface RecoverBody {
    userId: string;
    provider: Provider;
    planSlug: string;
    billingCycle: BillingCycle;
    // PG/스토어가 부여한 결제 키 (TID, transactionId 등) — payment_history.payment_id에 저장
    paymentId: string;
    // 카카오페이 정기결제 SID — 자동갱신을 위해 billing_keys에 저장
    sid?: string;
    // 결제 금액 — 미지정 시 PLAN_LIMITS 기준으로 계산
    amount?: number;
    // approve 단계에서 미정리된 kakaopay_sessions row가 있으면 함께 정리
    deleteStaleKakaoSession?: boolean;
    note?: string;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    let body: RecoverBody;
    try {
        body = (await request.json()) as RecoverBody;
    } catch {
        return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
    }

    const { userId, provider, planSlug, billingCycle, paymentId, sid, deleteStaleKakaoSession, note } = body;

    if (!userId || !provider || !planSlug || !billingCycle || !paymentId) {
        return NextResponse.json(
            { error: 'userId, provider, planSlug, billingCycle, paymentId 모두 필수입니다.' },
            { status: 400 }
        );
    }
    if (!['kakaopay', 'apple_iap', 'google_play'].includes(provider)) {
        return NextResponse.json({ error: `지원하지 않는 provider: ${provider}` }, { status: 400 });
    }
    if (provider === 'kakaopay' && !sid) {
        return NextResponse.json({ error: '카카오페이 복구 시 SID가 필요합니다.' }, { status: 400 });
    }

    const svc = await createServiceClient();

    // 1) 대상 사용자 존재 확인
    const { data: targetUser, error: userErr } = await svc.auth.admin.getUserById(userId);
    if (userErr || !targetUser?.user) {
        return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2) 플랜 조회
    const { data: plan, error: planErr } = await svc
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .single();
    if (planErr || !plan) {
        return NextResponse.json({ error: `플랜을 찾을 수 없습니다: ${planSlug}` }, { status: 404 });
    }

    // 3) 동일 paymentId가 이미 처리됐는지 확인 — 멱등 보장
    const { data: existingPayment } = await svc
        .from('payment_history')
        .select('id, subscription_id, status')
        .eq('payment_id', paymentId)
        .maybeSingle();

    if (existingPayment) {
        return NextResponse.json({
            error: '이미 등록된 결제 ID입니다.',
            existingPaymentId: existingPayment.id,
            existingSubscriptionId: existingPayment.subscription_id,
        }, { status: 409 });
    }

    let amount = body.amount;
    if (!amount || amount <= 0) {
        try {
            amount = getPlanPrice(planSlug, billingCycle);
        } catch {
            return NextResponse.json({ error: `금액 산정 실패 — 알 수 없는 플랜/주기: ${planSlug}/${billingCycle}` }, { status: 400 });
        }
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    // 4) 기존 active/trialing 구독 취소
    await svc
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: now.toISOString() })
        .eq('user_id', userId)
        .in('status', ['active', 'trialing']);

    // 5) 새 구독 INSERT
    const { data: subscription, error: subErr } = await svc
        .from('subscriptions')
        .insert({
            user_id: userId,
            plan_id: plan.id,
            status: 'active',
            billing_cycle: billingCycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_provider: provider,
            payment_key: provider === 'kakaopay' ? sid : paymentId,
        })
        .select()
        .single();

    if (subErr || !subscription) {
        await log.error('admin', 'recover_subscription_insert_failed', {
            userId,
            userEmail: user.email,
            message: subErr?.message || 'subscription insert returned null',
            metadata: { provider, planSlug, billingCycle, paymentId, sid, performedBy: user.email },
        });
        return NextResponse.json({ error: subErr?.message || '구독 생성 실패' }, { status: 500 });
    }

    // 6) 카카오페이는 billing_keys에 SID 저장 (자동갱신 cron이 사용)
    if (provider === 'kakaopay' && sid) {
        try {
            await svc
                .from('billing_keys')
                .upsert({
                    user_id: userId,
                    billing_key: sid,
                    provider: 'kakaopay',
                    created_at: now.toISOString(),
                }, { onConflict: 'user_id' });
        } catch { /* non-critical */ }
    }

    // 7) payment_history 기록
    try {
        await svc
            .from('payment_history')
            .insert({
                user_id: userId,
                subscription_id: subscription.id,
                payment_id: paymentId,
                amount,
                status: 'paid',
                billing_cycle: billingCycle,
                plan_slug: planSlug,
            });
    } catch { /* non-critical */ }

    // 8) 통합 payments 테이블에도 동일 레코드
    try {
        await svc
            .from('payments')
            .insert({
                user_id: userId,
                subscription_id: subscription.id,
                payment_id: paymentId,
                portone_payment_id: null,
                amount,
                status: 'paid',
                billing_cycle: billingCycle,
                plan_slug: planSlug,
                payment_method: provider,
            });
    } catch { /* non-critical — payments unique constraint 등 */ }

    // 9) usage_tracking 갱신
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const periodEndUsage = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    const newLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

    const { data: existingUsage } = await svc
        .from('usage_tracking')
        .select('id')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .maybeSingle();

    if (existingUsage) {
        await svc.from('usage_tracking').update({ analyses_limit: newLimit }).eq('id', existingUsage.id);
    } else {
        await svc.from('usage_tracking').insert({
            user_id: userId,
            period_start: periodStart,
            period_end: periodEndUsage,
            analyses_used: 0,
            analyses_limit: newLimit,
        });
    }

    // 10) 카카오페이 고아 세션 정리 (옵션)
    if (provider === 'kakaopay' && deleteStaleKakaoSession) {
        try {
            await svc.from('kakaopay_sessions').delete().eq('user_id', userId);
        } catch { /* non-critical */ }
    }

    await log.info('admin', 'recover_payment_success', {
        userId,
        userEmail: user.email,
        message: `${provider} 결제 수동 복구 (${amount}원)`,
        metadata: {
            provider,
            planSlug,
            billingCycle,
            paymentId,
            sid: sid || null,
            amount,
            subscriptionId: subscription.id,
            note: note || null,
            performedBy: user.email,
        },
    });

    return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        provider,
        planSlug,
        billingCycle,
        amount,
        message: `${provider} 결제를 복구했습니다 (${amount.toLocaleString()}원)`,
    });
}
