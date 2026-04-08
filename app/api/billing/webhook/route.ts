// app/api/billing/webhook/route.ts
// PortOne 웹훅: 결제 취소/환불 시 무료 플랜으로 복귀
import { NextResponse } from 'next/server';

async function getServiceSupabase() {
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sk) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sk);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[Webhook] PortOne event:', JSON.stringify(body).substring(0, 500));

        // PortOne V2 웹훅 형식
        const { type, data } = body;

        // 결제 취소/환불 이벤트
        if (type === 'Transaction.Cancelled' || type === 'Transaction.PartialCancelled' ||
            type === 'Payment.Cancelled' || type === 'payment.cancelled') {

            const paymentId = data?.paymentId || data?.payment_id || body.imp_uid;
            if (!paymentId) {
                console.log('[Webhook] paymentId 없음, 무시');
                return NextResponse.json({ ok: true });
            }

            console.log('[Webhook] 결제 취소 감지:', paymentId);

            const svc = await getServiceSupabase();

            // payment_key로 구독 찾기
            const { data: sub } = await svc
                .from('subscriptions')
                .select('id, user_id, status')
                .or(`payment_key.eq.${paymentId},billing_key.eq.${paymentId}`)
                .eq('status', 'active')
                .maybeSingle();

            if (sub) {
                // 구독 취소 처리
                await svc.from('subscriptions').update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                }).eq('id', sub.id);

                console.log('[Webhook] 구독 취소 완료:', sub.id, 'user:', sub.user_id);
            } else {
                console.log('[Webhook] 매칭되는 구독 없음:', paymentId);
            }

            return NextResponse.json({ ok: true });
        }

        // 그 외 이벤트는 무시
        console.log('[Webhook] 처리하지 않는 이벤트:', type);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Webhook] 에러:', error);
        return NextResponse.json({ ok: true }); // 웹훅은 항상 200 반환
    }
}
