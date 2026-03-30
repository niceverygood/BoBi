// app/api/discount/apply/route.ts
// 프로모션 코드 적용 API (DB 기반 + 기간 지원)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateDiscountCode } from '@/lib/utils/discount-codes';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: '할인코드를 입력해주세요.' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    try {
        // 1. DB에서 프로모 코드 조회
        const { data: promoCode } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', upperCode)
            .eq('active', true)
            .maybeSingle();

        // DB에 있으면 DB 기반 처리, 없으면 하드코딩 폴백
        if (promoCode) {
            return await applyPromoCode(supabase, user, promoCode);
        }

        // 하드코딩 폴백 (기존 호환)
        const discount = validateDiscountCode(upperCode);
        if (!discount) {
            return NextResponse.json({ error: '유효하지 않은 할인코드입니다.' }, { status: 400 });
        }

        return await applyLegacyCode(supabase, user, discount);
    } catch (error) {
        console.error('Discount apply error:', error);
        return NextResponse.json({
            error: `할인코드 적용 실패: ${(error as Error).message}`,
        }, { status: 500 });
    }
}

// DB 기반 프로모 코드 적용
async function applyPromoCode(supabase: Awaited<ReturnType<typeof createClient>>, user: { id: string }, promoCode: Record<string, unknown>) {
    // 만료 체크
    if (promoCode.expires_at && new Date(promoCode.expires_at as string) < new Date()) {
        return NextResponse.json({ error: '만료된 프로모션 코드입니다.' }, { status: 400 });
    }

    // 사용 횟수 체크
    if ((promoCode.max_uses as number) !== -1 && (promoCode.used_count as number) >= (promoCode.max_uses as number)) {
        return NextResponse.json({ error: '사용 한도가 초과된 프로모션 코드입니다.' }, { status: 400 });
    }

    // 중복 사용 체크
    const { data: existing } = await supabase
        .from('promo_code_redemptions')
        .select('id')
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: '이미 사용한 프로모션 코드입니다.' }, { status: 400 });
    }

    const planSlug = promoCode.plan_slug as string;
    const durationMonths = promoCode.duration_months as number;
    const priceOverride = promoCode.price_override as number;
    const upgradeToPlan = promoCode.upgrade_to_plan as string | null;

    // 플랜 조회 (upgrade_to_plan이 있으면 업그레이드 플랜 기준)
    // plan_slug가 'all'이거나 쉼표로 구분된 경우 → 기본 'pro' 사용
    let resolvedPlanSlug = upgradeToPlan || planSlug;
    if (resolvedPlanSlug === 'all' || resolvedPlanSlug.includes(',')) {
        // 'all' → 'pro' 기본, 'basic,pro' → 첫 번째 값 사용
        resolvedPlanSlug = resolvedPlanSlug === 'all' ? 'pro' : resolvedPlanSlug.split(',')[0].trim();
    }
    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', resolvedPlanSlug)
        .single();

    if (planError || !plan) {
        console.error('Plan lookup failed:', { resolvedPlanSlug, planSlug, upgradeToPlan, error: planError });
        return NextResponse.json({ error: `플랜을 찾을 수 없습니다. (${resolvedPlanSlug})` }, { status: 500 });
    }

    // 기간 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;

    let periodEnd: string;
    let promoExpiresAt: string | null = null;

    if (durationMonths === -1) {
        // 무제한
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else {
        // N개월 후
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        const endLastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        periodEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endLastDay).padStart(2, '0')}`;
        promoExpiresAt = periodEnd;
    }

    // 구독 업데이트/생성
    const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

    const subData = {
        plan_id: plan.id,
        payment_provider: 'promo_code',
        payment_key: promoCode.code as string,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
    };

    if (existingSub) {
        await supabase.from('subscriptions').update(subData).eq('id', existingSub.id);
    } else {
        await supabase.from('subscriptions').insert({
            user_id: user.id,
            status: 'active',
            billing_cycle: 'monthly',
            ...subData,
        });
    }

    // 사용량 업데이트
    const analysesLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;
    const { data: existingUsage } = await supabase
        .from('usage_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('period_start', periodStart)
        .maybeSingle();

    if (existingUsage) {
        await supabase.from('usage_tracking')
            .update({ analyses_limit: analysesLimit, updated_at: new Date().toISOString() })
            .eq('id', existingUsage.id);
    } else {
        await supabase.from('usage_tracking').insert({
            user_id: user.id,
            period_start: periodStart,
            period_end: periodEnd,
            analyses_used: 0,
            analyses_limit: analysesLimit,
        });
    }

    // 사용 이력 기록
    await supabase.from('promo_code_redemptions').insert({
        promo_code_id: promoCode.id,
        user_id: user.id,
        code: promoCode.code,
        plan_slug: planSlug,
        duration_months: durationMonths,
        starts_at: now.toISOString(),
        expires_at: promoExpiresAt,
        status: 'active',
    });

    // 사용 횟수 증가
    await supabase.from('promo_codes')
        .update({ used_count: ((promoCode.used_count as number) || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', promoCode.id);

    const durationText = durationMonths === -1 ? '무기한' : `${durationMonths}개월`;
    const priceText = priceOverride === 0 ? '무료' : `월 ${priceOverride.toLocaleString()}원`;
    const upgradeText = upgradeToPlan ? ` (${plan.display_name} 플랜으로 업그레이드!)` : '';
    const actualPlanSlug = resolvedPlanSlug;

    return NextResponse.json({
        success: true,
        message: `프로모션 코드가 적용되었습니다! ${plan.display_name} 플랜 활성화 ${priceText}${upgradeText}`,
        plan: { slug: actualPlanSlug, name: plan.display_name },
        price: priceOverride,
        duration: durationMonths,
        expiresAt: promoExpiresAt,
        upgraded: upgradeToPlan ? true : false,
    });
}

// 하드코딩 폴백 (기존 호환)
async function applyLegacyCode(
    supabase: Awaited<ReturnType<typeof createClient>>,
    user: { id: string },
    discount: { code: string; planSlug: string; priceOverride: number; upgradeToPlan?: string }
) {
    // upgradeToPlan이 있으면 업그레이드 플랜 기준으로 조회
    const actualPlanSlug = discount.upgradeToPlan || discount.planSlug;
    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', actualPlanSlug)
        .single();

    if (planError || !plan) {
        return NextResponse.json({ error: '플랜을 찾을 수 없습니다.' }, { status: 500 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const { data: existingSub } = await supabase
        .from('subscriptions').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();

    const subData = {
        plan_id: plan.id,
        payment_provider: 'discount_code',
        payment_key: discount.code,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
    };

    if (existingSub) {
        await supabase.from('subscriptions').update(subData).eq('id', existingSub.id);
    } else {
        await supabase.from('subscriptions').insert({ user_id: user.id, status: 'active', billing_cycle: 'monthly', ...subData });
    }

    const analysesLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;
    const { data: existingUsage } = await supabase
        .from('usage_tracking').select('id').eq('user_id', user.id).eq('period_start', periodStart).maybeSingle();

    if (existingUsage) {
        await supabase.from('usage_tracking')
            .update({ analyses_limit: analysesLimit, updated_at: new Date().toISOString() })
            .eq('id', existingUsage.id);
    } else {
        await supabase.from('usage_tracking').insert({
            user_id: user.id, period_start: periodStart, period_end: periodEnd,
            analyses_used: 0, analyses_limit: analysesLimit,
        });
    }

    const upgradeLabel = discount.upgradeToPlan ? ` → ${plan.display_name} 업그레이드!` : '';

    return NextResponse.json({
        success: true,
        message: `할인코드가 적용되었습니다! ${plan.display_name} 플랜${discount.priceOverride === 0 ? ' (무료)' : ` (월 ${discount.priceOverride.toLocaleString()}원)`}${upgradeLabel}`,
        plan: { slug: actualPlanSlug, name: plan.display_name },
        price: discount.priceOverride,
        upgraded: discount.upgradeToPlan ? true : false,
    });
}
