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

        const { packId, paymentId, platform, receipt, transactionId } = await request.json();
        const pack = CREDIT_PACKS.find(p => p.id === packId);

        if (!pack) {
            return NextResponse.json({ error: '유효하지 않은 크레딧 팩입니다.' }, { status: 400 });
        }

        // 결제 검증
        const paymentKey = paymentId || transactionId || `manual-${Date.now()}`;

        // 중복 구매 방지: 동일 paymentKey 체크
        if (paymentKey && !paymentKey.startsWith('manual-')) {
            const { data: existing } = await supabase
                .from('credit_transactions')
                .select('id')
                .eq('payment_key', paymentKey)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ error: '이미 처리된 결제입니다.' }, { status: 409 });
            }
        }

        // TODO: 플랫폼별 영수증 검증
        // - web: 포트원 API로 paymentId 검증
        // - ios: Apple 영수증 검증
        // - android: Google Play 영수증 검증

        // 1. 크레딧 트랜잭션 기록
        const { error: txError } = await supabase
            .from('credit_transactions')
            .insert({
                user_id: user.id,
                pack_id: pack.id,
                credits: pack.credits,
                amount: pack.price,
                payment_key: paymentKey,
                type: 'purchase',
            });

        if (txError) {
            console.error('Credit transaction error:', txError);
            return NextResponse.json({ error: '크레딧 구매 기록 실패' }, { status: 500 });
        }

        // 2. 크레딧 잔액 업데이트 (upsert)
        const { data: existingBalance } = await supabase
            .from('credit_balances')
            .select('credits_remaining, credits_purchased')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingBalance) {
            const { error: updateError } = await supabase
                .from('credit_balances')
                .update({
                    credits_remaining: existingBalance.credits_remaining + pack.credits,
                    credits_purchased: existingBalance.credits_purchased + pack.credits,
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
            total_credits: (existingBalance?.credits_remaining ?? 0) + pack.credits,
            message: `${pack.name} 크레딧이 충전되었습니다.`,
        });
    } catch (error) {
        console.error('Credit purchase error:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
