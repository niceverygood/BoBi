// app/api/billing/webhook/route.ts
// PortOne 웹훅: 결제 취소/환불 시 무료 플랜으로 복귀
import { NextResponse } from 'next/server';
import { log } from '@/lib/monitoring/system-log';

async function getServiceSupabase() {
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sk) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, sk);
}

async function revertToFree(svc: any, userId: string, reason: string) {
    // 1. 모든 active 구독을 cancelled로
    const { data: activeSubs } = await svc
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

    if (activeSubs && activeSubs.length > 0) {
        for (const sub of activeSubs) {
            await svc.from('subscriptions').update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
            }).eq('id', sub.id);
        }
        console.log(`[Webhook] ${activeSubs.length}개 구독 취소 완료 (${reason})`);
    }

    // 2. usage_tracking을 무료 플랜 한도(5건)로 리셋
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;

    const { data: existingUsage } = await svc
        .from('usage_tracking')
        .select('id')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .maybeSingle();

    if (existingUsage) {
        await svc.from('usage_tracking').update({
            analyses_limit: 5, // 무료 플랜 한도
        }).eq('id', existingUsage.id);
        console.log(`[Webhook] usage_tracking 무료 한도(5)로 리셋`);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[Webhook] PortOne event:', JSON.stringify(body).substring(0, 500));

        // PortOne V2 웹훅 형식
        const { type, data } = body;

        log.info('webhook', 'portone_webhook_received', {
            metadata: { type, dataPreview: JSON.stringify(data || body).slice(0, 400) },
        });

        // 결제 취소/환불 이벤트 (여러 형식 대응)
        const cancelTypes = [
            'Transaction.Cancelled', 'Transaction.PartialCancelled',
            'Payment.Cancelled', 'payment.cancelled',
            'Transaction.PaymentCancelled',
            'payment_cancel.success', // V1 형식
        ];

        if (cancelTypes.includes(type)) {
            const paymentId = data?.paymentId || data?.payment_id || body.imp_uid || body.paymentId;
            if (!paymentId) {
                console.log('[Webhook] paymentId 없음, 무시');
                return NextResponse.json({ ok: true });
            }

            console.log('[Webhook] 결제 취소 감지:', paymentId);
            const svc = await getServiceSupabase();

            // 1차: payment_key로 구독 찾기
            let sub = null;
            const { data: subByKey } = await svc
                .from('subscriptions')
                .select('id, user_id, status')
                .or(`payment_key.eq.${paymentId},billing_key.eq.${paymentId}`)
                .eq('status', 'active')
                .maybeSingle();
            sub = subByKey;

            // 2차: payments 테이블에서 user_id 찾기
            if (!sub) {
                const { data: payment } = await svc
                    .from('payments')
                    .select('user_id')
                    .or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId}`)
                    .maybeSingle();

                if (payment?.user_id) {
                    const { data: subByUser } = await svc
                        .from('subscriptions')
                        .select('id, user_id, status')
                        .eq('user_id', payment.user_id)
                        .eq('status', 'active')
                        .maybeSingle();
                    sub = subByUser;
                }
            }

            if (sub) {
                await revertToFree(svc, sub.user_id, `webhook paymentId=${paymentId}`);

                // payments 테이블에 취소 기록
                try {
                    await svc.from('payments').update({
                        status: 'cancelled',
                        cancelled_by: 'admin', // 포트원 콘솔에서 취소 = 관리자 취소
                        cancelled_at: new Date().toISOString(),
                    }).or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId}`);
                } catch { /* payments 테이블 구조에 따라 무시 */ }

                console.log('[Webhook] 무료 플랜 복귀 완료:', sub.user_id);
                log.warn('webhook', 'payment_cancelled_reverted_to_free', {
                    userId: sub.user_id,
                    metadata: { paymentId, webhookType: type },
                });
            } else {
                console.log('[Webhook] 매칭되는 구독 없음:', paymentId);
                log.warn('webhook', 'webhook_unmatched_payment', {
                    metadata: { paymentId, webhookType: type },
                });
            }

            return NextResponse.json({ ok: true });
        }

        // 그 외 이벤트는 무시
        console.log('[Webhook] 처리하지 않는 이벤트:', type);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Webhook] 에러:', error);
        log.error('webhook', 'webhook_handler_error', {
            message: (error as Error).message,
        });
        return NextResponse.json({ ok: true }); // 웹훅은 항상 200 반환
    }
}
