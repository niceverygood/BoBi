import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CREDIT_PACKS } from '@/lib/utils/constants';
import { getPaymentStatus } from '@/lib/portone/server';

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

        const paymentKey = paymentId || transactionId;
        if (!paymentKey) {
            return NextResponse.json({ error: '결제 정보가 누락되었습니다.' }, { status: 400 });
        }

        const serviceClient = await createServiceClient();

        // 중복 구매 방지
        const { data: existing } = await serviceClient
            .from('credit_transactions')
            .select('id')
            .eq('payment_key', paymentKey)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: '이미 처리된 결제입니다.' }, { status: 409 });
        }

        // 서버 사이드 결제 검증
        if (platform === 'web' || !platform) {
            const paymentStatus = await getPaymentStatus(paymentKey);
            if (paymentStatus.status !== 'PAID') {
                console.error(`Payment verification failed: ${paymentKey} status=${paymentStatus.status}`);
                return NextResponse.json({ error: '결제가 확인되지 않습니다. 결제를 완료해주세요.' }, { status: 402 });
            }
        }
        // iOS/Android IAP는 /api/iap/verify 경유

        // 1. 크레딧 트랜잭션 기록
        const { error: txError } = await serviceClient
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

        // 2. 크레딧 잔액 원자적 업데이트 (upsert + increment)
        const { data: existingBalance } = await serviceClient
            .from('credit_balances')
            .select('credits_remaining, credits_purchased')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingBalance) {
            const { error: updateError } = await serviceClient
                .from('credit_balances')
                .update({
                    credits_remaining: (existingBalance.credits_remaining || 0) + pack.credits,
                    credits_purchased: (existingBalance.credits_purchased || 0) + pack.credits,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

            if (updateError) {
                return NextResponse.json({ error: '크레딧 잔액 업데이트 실패' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await serviceClient
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
