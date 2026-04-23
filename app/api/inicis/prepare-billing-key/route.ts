// app/api/inicis/prepare-billing-key/route.ts
// 인증된 설계사의 요청을 받아 INIpay 빌링키 발급 폼 파라미터를 반환한다.
// 클라이언트는 이 파라미터로 form을 만든 뒤 INIStdPay.pay('form_id')를 호출한다.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildBillingKeyForm, getInipayScriptUrl } from '@/lib/inicis/server';
import { getPlanPrice } from '@/lib/utils/pricing';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const planSlug = String(body.planSlug || '').trim();
        const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const buyerName = String(body.buyerName || '').trim();
        const buyerEmail = String(body.buyerEmail || '').trim();
        const buyerTel = String(body.buyerTel || '').replace(/[^0-9]/g, '');
        const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
        const upgradePlanSlug = body.upgradePlanSlug ? String(body.upgradePlanSlug).trim() : null;

        if (!planSlug) return NextResponse.json({ error: 'planSlug 누락' }, { status: 400 });
        if (!buyerName || !buyerEmail || !buyerTel) {
            return NextResponse.json({ error: '구매자 정보가 필요합니다.' }, { status: 400 });
        }

        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('slug, display_name')
            .eq('slug', planSlug)
            .maybeSingle();
        if (!plan) {
            return NextResponse.json({ error: '플랜을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 결제창 표시용 금액 계산 (실제 청구는 return 콜백에서 다시 계산)
        let displayAmount = getPlanPrice(plan.slug, billingCycle);
        if (couponCode) {
            const { data: coupon } = await supabase
                .from('promo_codes')
                .select('discount_type, discount_value, price_override, expires_at, max_uses, used_count, active')
                .eq('code', couponCode)
                .eq('active', true)
                .maybeSingle();
            if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date())) {
                if (coupon.discount_type === 'percent') {
                    displayAmount = Math.max(0, displayAmount - Math.round((displayAmount * Math.min(coupon.discount_value, 100)) / 100));
                } else if (coupon.discount_type === 'fixed') {
                    displayAmount = Math.max(0, displayAmount - coupon.discount_value);
                } else if (coupon.price_override !== null && coupon.price_override !== undefined) {
                    displayAmount = Math.max(0, coupon.price_override);
                }
            }
        }
        // BILLAUTH 모드는 실제 청구 없음. 0원은 일부 카드사 거부 가능 → 최소 100원
        if (displayAmount <= 0) displayAmount = 100;

        const origin =
            process.env.NEXT_PUBLIC_BASE_URL ||
            request.headers.get('origin') ||
            'https://www.bobi.co.kr';
        const returnUrl = `${origin.replace(/\/$/, '')}/api/inicis/billing-key-return`;
        // closeUrl: 공개 라우트(/inicis/closed)로 지정해 미들웨어 auth redirect 회피
        const closeUrl = `${origin.replace(/\/$/, '')}/inicis/closed`;

        // merchantData: 서버 callback에서 우리가 받을 페이로드
        const form = buildBillingKeyForm({
            goodName: `보비 ${plan.display_name} 플랜 정기결제 (${billingCycle === 'yearly' ? '연간' : '월간'})`,
            buyerName,
            buyerTel,
            buyerEmail,
            returnUrl,
            closeUrl,
            merchantData: body.merchantData || '',
            displayPrice: displayAmount,
            enableAppCard: true,
            enableIsp: true,
            enableEasyPay: true,
        });

        // 발급 세션을 inicis_pending_billing_keys 테이블에 저장 (returnUrl 콜백에서 조회)
        try {
            await supabase.from('inicis_pending_billing_keys').insert({
                oid: form.oid,
                user_id: user.id,
                plan_slug: planSlug,
                billing_cycle: billingCycle,
                coupon_code: couponCode,
                upgrade_plan_slug: upgradePlanSlug,
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                buyer_tel: buyerTel,
            });
        } catch (err) {
            console.warn('[inicis/prepare] 세션 DB 저장 실패 (테이블 미존재 가능):', err);
        }

        return NextResponse.json({
            form,
            scriptUrl: getInipayScriptUrl(),
            oid: form.oid,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || '빌링키 발급 준비 실패' },
            { status: 500 },
        );
    }
}
