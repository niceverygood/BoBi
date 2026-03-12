// app/api/discount/apply/route.ts
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

    const discount = validateDiscountCode(code);
    if (!discount) {
        return NextResponse.json({ error: '유효하지 않은 할인코드입니다.' }, { status: 400 });
    }

    try {
        // Get the target plan
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('slug', discount.planSlug)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ error: '플랜을 찾을 수 없습니다.' }, { status: 500 });
        }

        // Calculate period dates
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // Check existing subscription
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingSub) {
            await supabase
                .from('subscriptions')
                .update({
                    plan_id: plan.id,
                    payment_provider: 'discount_code',
                    payment_key: discount.code,
                    current_period_start: periodStart,
                    current_period_end: periodEnd,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingSub.id);
        } else {
            await supabase
                .from('subscriptions')
                .insert({
                    user_id: user.id,
                    plan_id: plan.id,
                    status: 'active',
                    billing_cycle: 'monthly',
                    payment_provider: 'discount_code',
                    payment_key: discount.code,
                    current_period_start: periodStart,
                    current_period_end: periodEnd,
                });
        }

        // Update usage tracking
        const analysesLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

        const { data: existingUsage } = await supabase
            .from('usage_tracking')
            .select('id')
            .eq('user_id', user.id)
            .eq('period_start', periodStart)
            .maybeSingle();

        if (existingUsage) {
            await supabase
                .from('usage_tracking')
                .update({
                    analyses_limit: analysesLimit,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingUsage.id);
        } else {
            await supabase
                .from('usage_tracking')
                .insert({
                    user_id: user.id,
                    period_start: periodStart,
                    period_end: periodEnd,
                    analyses_used: 0,
                    analyses_limit: analysesLimit,
                });
        }

        return NextResponse.json({
            success: true,
            message: `할인코드가 적용되었습니다! ${plan.display_name} 플랜${discount.priceOverride === 0 ? ' (무료)' : ` (월 ${discount.priceOverride.toLocaleString()}원)`}`,
            plan: { slug: discount.planSlug, name: plan.display_name },
            price: discount.priceOverride,
        });
    } catch (error) {
        console.error('Discount apply error:', error);
        return NextResponse.json({
            error: `할인코드 적용 실패: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
