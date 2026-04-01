import { NextResponse, NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { kakaoPayApprove } from '@/lib/kakaopay/client';

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

        // Calculate period
        const now = new Date();
        const periodEnd = new Date(now);
        if (session.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Cancel any existing active subscription
        await serviceClient
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: now.toISOString() })
            .eq('user_id', partnerUserId)
            .eq('status', 'active');

        // Create new subscription (actualPlan = 업그레이드된 플랜 또는 원래 플랜)
        const { data: subscription } = await serviceClient
            .from('subscriptions')
            .insert({
                user_id: partnerUserId,
                plan_id: actualPlan.id,
                status: 'active',
                billing_cycle: session.billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                payment_provider: 'kakaopay',
                payment_key: sid,
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
        try {
            await serviceClient
                .from('payment_history')
                .insert({
                    user_id: partnerUserId,
                    subscription_id: subscription?.id,
                    payment_id: approveResponse.tid,
                    amount: session.amount,
                    status: 'paid',
                    billing_cycle: session.billing_cycle,
                    plan_slug: session.plan_slug,
                });
        } catch {
            // non-critical
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

        // 성공 시 구독 완료 페이지로 리다이렉트 (실제 적용된 플랜 표시)
        return NextResponse.redirect(
            new URL(`/dashboard/subscribe?status=success&plan=${actualPlan.slug}`, request.url)
        );

    } catch (error) {
        const errorMsg = encodeURIComponent((error as Error).message);
        return NextResponse.redirect(
            new URL(`/dashboard/subscribe?status=fail&error=${errorMsg}`, request.url)
        );
    }
}
