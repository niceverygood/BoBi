// app/api/admin/refund/route.ts
// 관리자 결제 환불 — PG사(카카오페이/토스페이먼츠)에 직접 취소 요청 후 DB 반영.
// 이니시스는 별도 해시 시그니처가 필요해 미구현 — 확인용 에러 반환.

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';
import { kakaoPayCancel } from '@/lib/kakaopay/client';
import { cancelPayment as tossCancelPayment } from '@/lib/tosspayments/server';
import { log } from '@/lib/monitoring/system-log';

type Source = 'payments' | 'payment_history';

interface RefundRequestBody {
    recordId: string;
    source: Source;
    reason?: string;
}

function inferProvider(payment_method?: string | null, fallback?: string | null): string {
    const raw = String(payment_method || fallback || '').toLowerCase();
    if (raw.includes('kakao')) return 'kakaopay';
    if (raw.includes('toss')) return 'tosspayments';
    if (raw.includes('inicis')) return 'inicis';
    if (raw.includes('apple') || raw === 'ios' || raw === 'app_store') return 'apple_iap';
    if (raw.includes('google') || raw === 'android' || raw === 'play_store') return 'google_play';
    return raw || 'card';
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    let body: RefundRequestBody;
    try {
        body = (await request.json()) as RefundRequestBody;
    } catch {
        return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
    }

    const { recordId, source, reason } = body;
    if (!recordId || !source || (source !== 'payments' && source !== 'payment_history')) {
        return NextResponse.json({ error: 'recordId, source(payments|payment_history)가 필요합니다.' }, { status: 400 });
    }

    const svc = await createServiceClient();

    // 1) 원본 결제 레코드 조회
    const { data: record, error: fetchErr } = await svc
        .from(source)
        .select('*')
        .eq('id', recordId)
        .single();

    if (fetchErr || !record) {
        return NextResponse.json({ error: '결제 레코드를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (record.status === 'refunded' || record.status === 'cancelled') {
        return NextResponse.json({ error: '이미 환불/취소된 결제입니다.' }, { status: 409 });
    }

    const tid: string | undefined = record.payment_id || record.portone_payment_id;
    const amount: number = Number(record.amount) || 0;
    const userId: string | undefined = record.user_id;

    if (!tid) {
        return NextResponse.json({ error: '결제 ID(TID)가 없어 환불 불가합니다.' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
        return NextResponse.json({ error: '결제 금액이 유효하지 않습니다.' }, { status: 400 });
    }

    // 2) provider 판별 — payment_method 우선, 없으면 같은 user의 subscription에서 유추
    let provider = inferProvider(record.payment_method, record.provider);
    if (provider === 'card' || !provider) {
        const { data: sub } = await svc
            .from('subscriptions')
            .select('payment_provider')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (sub?.payment_provider) provider = inferProvider(sub.payment_provider);
    }

    const cancelReason = reason?.trim() || '관리자 환불';

    // 3) PG사 취소 호출
    let pgResult: { success: boolean; errorCode?: string; errorMessage?: string; raw?: unknown };
    try {
        if (provider === 'kakaopay') {
            const r = await kakaoPayCancel({ tid, cancelAmount: amount });
            pgResult = { success: true, raw: r };
        } else if (provider === 'tosspayments') {
            const r = await tossCancelPayment({ paymentKey: tid, cancelReason, cancelAmount: amount });
            pgResult = r;
        } else if (provider === 'inicis') {
            return NextResponse.json({
                error: '이니시스 자동 환불은 아직 지원하지 않습니다. 이니시스 가맹점 어드민에서 직접 취소해주세요.',
            }, { status: 501 });
        } else if (provider === 'apple_iap' || provider === 'google_play') {
            return NextResponse.json({
                error: '앱 결제(Apple/Google)는 각 스토어에서 직접 환불해야 합니다.',
            }, { status: 501 });
        } else {
            return NextResponse.json({ error: `지원하지 않는 결제수단: ${provider}` }, { status: 400 });
        }
    } catch (err) {
        pgResult = { success: false, errorMessage: (err as Error).message };
    }

    if (!pgResult.success) {
        await log.error('admin', 'refund_failed_pg', {
            userId: userId,
            userEmail: user.email,
            message: `PG 환불 실패 (${provider})`,
            metadata: { tid, amount, provider, recordId, source, error: pgResult.errorMessage, code: pgResult.errorCode },
        });
        return NextResponse.json({
            error: `PG사 환불 실패: ${pgResult.errorMessage || pgResult.errorCode || '알 수 없는 오류'}`,
        }, { status: 502 });
    }

    // 4) DB 반영 — payment_history + payments 둘 다 같은 payment_id로 업데이트
    const nowIso = new Date().toISOString();

    const { error: phErr } = await svc
        .from('payment_history')
        .update({ status: 'refunded' })
        .eq('payment_id', tid);
    if (phErr) {
        await log.warn('admin', 'refund_db_payment_history_update_failed', {
            userId, userEmail: user.email, metadata: { tid, error: phErr.message },
        });
    }

    try {
        await svc
            .from('payments')
            .update({
                status: 'refunded',
                cancelled_at: nowIso,
                cancelled_by: 'admin',
            })
            .eq('payment_id', tid);
    } catch { /* payments 테이블에 cancelled_* 컬럼 없을 수 있음 — 무시 */ }

    // 5) 활성 구독이 있으면 함께 취소
    if (userId) {
        const { data: activeSubs } = await svc
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');
        if (activeSubs && activeSubs.length > 0) {
            await svc.from('subscriptions')
                .update({
                    status: 'cancelled',
                    cancelled_at: nowIso,
                    cancelled_by: 'admin',
                })
                .in('id', activeSubs.map(s => s.id));
        }

        // 무료 한도(5건)로 리셋
        const now = new Date();
        const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        await svc.from('usage_tracking')
            .update({ analyses_limit: 5 })
            .eq('user_id', userId)
            .eq('period_start', periodStart);
    }

    await log.info('admin', 'refund_success', {
        userId, userEmail: user.email,
        message: `${provider} 환불 완료 (${amount}원)`,
        metadata: { tid, amount, provider, recordId, source, reason: cancelReason, performedBy: user.email },
    });

    return NextResponse.json({
        success: true,
        provider,
        tid,
        amount,
        message: `${provider} 환불 완료 — ${amount.toLocaleString()}원`,
    });
}
