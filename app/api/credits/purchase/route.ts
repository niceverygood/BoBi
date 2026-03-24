import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CREDIT_PACKS } from '@/lib/utils/constants';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { packId } = await request.json();
        const pack = CREDIT_PACKS.find(p => p.id === packId);

        if (!pack) {
            return NextResponse.json({ error: '유효하지 않은 크레딧 팩입니다.' }, { status: 400 });
        }

        // TODO: 실제 결제 프로세스 연동 (포트원 등)
        // 현재는 크레딧을 바로 충전하는 로직 (결제 연동 후 교체 필요)

        // 1. 크레딧 트랜잭션 기록
        const { error: txError } = await supabase
            .from('credit_transactions')
            .insert({
                user_id: user.id,
                pack_id: pack.id,
                credits: pack.credits,
                amount: pack.price,
            });

        if (txError) {
            console.error('Credit transaction error:', txError);
            return NextResponse.json({ error: '크레딧 구매 기록 실패' }, { status: 500 });
        }

        // 2. 크레딧 잔액 업데이트 (upsert)
        const { data: existing } = await supabase
            .from('credit_balances')
            .select('credits_remaining, credits_purchased')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) {
            const { error: updateError } = await supabase
                .from('credit_balances')
                .update({
                    credits_remaining: existing.credits_remaining + pack.credits,
                    credits_purchased: existing.credits_purchased + pack.credits,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

            if (updateError) {
                return NextResponse.json({ error: '크레딧 잔액 업데이트 실패' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('credit_balances')
                .insert({
                    user_id: user.id,
                    credits_remaining: pack.credits,
                    credits_purchased: pack.credits,
                });

            if (insertError) {
                return NextResponse.json({ error: '크레딧 잔액 생성 실패' }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            credits_added: pack.credits,
            message: `${pack.name} 크레딧이 충전되었습니다.`,
        });
    } catch (error) {
        console.error('Credit purchase error:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
