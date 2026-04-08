// app/api/billing/history/route.ts
// 유저 결제 내역 조회 (결제 + 취소)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // payments 테이블 조회
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        // subscriptions 이력 (활성 + 취소)
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(display_name, slug)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        return NextResponse.json({
            payments: payments || [],
            subscriptions: subs || [],
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
