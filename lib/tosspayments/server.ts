// lib/tosspayments/server.ts
// 토스페이먼츠 V2 자동결제(빌링) 서버 로직
//
// 환경변수:
//   TOSSPAYMENTS_SECRET_KEY   (테스트 시 test_gsk_* 또는 test_sk_*)
//   TOSSPAYMENTS_CLIENT_KEY   (클라이언트에 NEXT_PUBLIC_으로 노출)
//
// 공식 문서: https://docs.tosspayments.com/guides/v2/billing

import crypto from 'crypto';
import type {
    TossBillingKeyIssueResponse,
    TossBillingChargeResponse,
    TossErrorResponse,
    TossBillingIssueResult,
    TossBillingChargeResult,
} from './types';

const TOSS_API_BASE = 'https://api.tosspayments.com';

function getSecretKey(): string {
    const key = process.env.TOSSPAYMENTS_SECRET_KEY;
    if (!key) {
        throw new Error('TOSSPAYMENTS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    }
    return key;
}

/** 시크릿 키로 Basic 인증 헤더 생성 — Base64(secretKey + ':') */
function authHeader(): string {
    const key = getSecretKey();
    const encoded = Buffer.from(`${key}:`).toString('base64');
    return `Basic ${encoded}`;
}

/** customerKey 생성 — UUID 기반, 영문/숫자/허용 특수문자만 사용 */
export function generateCustomerKey(userId: string): string {
    // 토스페이먼츠 customerKey 규칙:
    //   - 영문 대소문자, 숫자, - _ = . @ 만 허용
    //   - 최소 2자 ~ 최대 300자
    //   - 유추 가능한 값 금지 (auto-increment, email, phone 등)
    // → userId(UUID) + 랜덤 해시를 연결해 고유하면서 유추 불가능하게
    const rand = crypto.randomBytes(16).toString('hex');
    return `${userId.replace(/-/g, '')}_${rand}`;
}

/** 고유 주문번호 생성 */
export function generateOrderId(prefix: string = 'bobi'): string {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(6).toString('hex');
    return `${prefix}_${ts}_${rnd}`.slice(0, 64);
}

/**
 * 빌링키 발급 (SDK successUrl 콜백용)
 *
 * 클라이언트에서 tossPayments.requestBillingAuth() 후 리다이렉트되는
 * successUrl의 authKey + customerKey를 받아 실제 빌링키로 교환한다.
 *
 * POST https://api.tosspayments.com/v1/billing/authorizations/issue
 */
export async function issueBillingKey(params: {
    authKey: string;
    customerKey: string;
}): Promise<TossBillingIssueResult> {
    try {
        const response = await fetch(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
            method: 'POST',
            headers: {
                Authorization: authHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                authKey: params.authKey,
                customerKey: params.customerKey,
            }),
        });

        const json = (await response.json()) as TossBillingKeyIssueResponse | TossErrorResponse;

        if (!response.ok || 'code' in json) {
            const err = json as TossErrorResponse;
            return {
                success: false,
                errorCode: err.code || `HTTP_${response.status}`,
                errorMessage: err.message || `토스페이먼츠 빌링키 발급 실패 (HTTP ${response.status})`,
                raw: err,
            };
        }

        const ok = json as TossBillingKeyIssueResponse;
        return {
            success: true,
            billingKey: ok.billingKey,
            customerKey: ok.customerKey,
            cardCompany: ok.cardCompany,
            cardNumber: ok.cardNumber,
            raw: ok,
        };
    } catch (err) {
        return {
            success: false,
            errorCode: 'NETWORK_ERROR',
            errorMessage: (err as Error).message,
        };
    }
}

/**
 * 자동결제 승인 (빌링키로 실제 청구)
 *
 * POST https://api.tosspayments.com/v1/billing/{billingKey}
 *
 * 정기결제 스케줄러(cron)에서 주기적으로 호출.
 */
export interface ChargeBillingKeyInput {
    billingKey: string;
    customerKey: string;
    amount: number;      // 원 단위 정수
    orderId: string;     // 고유 주문번호
    orderName: string;   // 상품명
    customerEmail?: string;
    customerName?: string;
    taxFreeAmount?: number;
}

export async function chargeBillingKey(
    input: ChargeBillingKeyInput,
): Promise<TossBillingChargeResult> {
    try {
        const response = await fetch(
            `${TOSS_API_BASE}/v1/billing/${encodeURIComponent(input.billingKey)}`,
            {
                method: 'POST',
                headers: {
                    Authorization: authHeader(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerKey: input.customerKey,
                    amount: input.amount,
                    orderId: input.orderId,
                    orderName: input.orderName,
                    customerEmail: input.customerEmail,
                    customerName: input.customerName,
                    taxFreeAmount: input.taxFreeAmount || 0,
                }),
            },
        );

        const json = (await response.json()) as TossBillingChargeResponse | TossErrorResponse;

        if (!response.ok || 'code' in json) {
            const err = json as TossErrorResponse;
            return {
                success: false,
                errorCode: err.code || `HTTP_${response.status}`,
                errorMessage: err.message || `토스페이먼츠 결제 실패 (HTTP ${response.status})`,
                raw: err,
            };
        }

        const ok = json as TossBillingChargeResponse;
        const success = ok.status === 'DONE';
        return {
            success,
            paymentKey: ok.paymentKey,
            orderId: ok.orderId,
            approvedAt: ok.approvedAt,
            errorCode: success ? undefined : (ok.failure?.code ?? ok.status),
            errorMessage: success ? undefined : (ok.failure?.message ?? `status=${ok.status}`),
            raw: ok,
        };
    } catch (err) {
        return {
            success: false,
            errorCode: 'NETWORK_ERROR',
            errorMessage: (err as Error).message,
        };
    }
}

/**
 * 빌링키 삭제 (구독 해지 시 호출 — 선택)
 *
 * DELETE https://api.tosspayments.com/v1/billing/{billingKey}
 */
export async function deleteBillingKey(billingKey: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
        const response = await fetch(
            `${TOSS_API_BASE}/v1/billing/${encodeURIComponent(billingKey)}`,
            {
                method: 'DELETE',
                headers: { Authorization: authHeader() },
            },
        );
        if (!response.ok) {
            const txt = await response.text().catch(() => '');
            return { success: false, errorMessage: `HTTP ${response.status}: ${txt.slice(0, 200)}` };
        }
        return { success: true };
    } catch (err) {
        return { success: false, errorMessage: (err as Error).message };
    }
}

/**
 * 결제 취소 (전액/부분)
 *
 * POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel
 *
 * cancelAmount 미지정 시 전액 취소.
 */
export async function cancelPayment(params: {
    paymentKey: string;
    cancelReason: string;
    cancelAmount?: number;
}): Promise<{
    success: boolean;
    cancelledAmount?: number;
    status?: string;
    errorCode?: string;
    errorMessage?: string;
    raw?: unknown;
}> {
    try {
        const body: Record<string, unknown> = { cancelReason: params.cancelReason };
        if (typeof params.cancelAmount === 'number') {
            body.cancelAmount = params.cancelAmount;
        }

        const response = await fetch(
            `${TOSS_API_BASE}/v1/payments/${encodeURIComponent(params.paymentKey)}/cancel`,
            {
                method: 'POST',
                headers: {
                    Authorization: authHeader(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            },
        );

        const json = (await response.json()) as Record<string, unknown>;

        if (!response.ok || (json && typeof json === 'object' && 'code' in json && !('status' in json))) {
            return {
                success: false,
                errorCode: String(json?.code || `HTTP_${response.status}`),
                errorMessage: String(json?.message || `토스페이먼츠 결제 취소 실패 (HTTP ${response.status})`),
                raw: json,
            };
        }

        const cancels = Array.isArray(json.cancels) ? (json.cancels as Array<{ cancelAmount?: number }>) : [];
        const cancelledAmount = cancels.reduce((sum, c) => sum + (Number(c.cancelAmount) || 0), 0);

        return {
            success: true,
            cancelledAmount: cancelledAmount || params.cancelAmount,
            status: typeof json.status === 'string' ? json.status : undefined,
            raw: json,
        };
    } catch (err) {
        return {
            success: false,
            errorCode: 'NETWORK_ERROR',
            errorMessage: (err as Error).message,
        };
    }
}
