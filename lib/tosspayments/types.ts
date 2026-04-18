// lib/tosspayments/types.ts
// 토스페이먼츠 V2 자동결제(빌링) 연동 타입

/** 빌링키 발급 응답 */
export interface TossBillingKeyIssueResponse {
    mId: string;
    customerKey: string;
    authenticatedAt: string;
    method: string;
    billingKey: string;
    cardCompany?: string;
    cardNumber?: string;
    card?: {
        issuerCode: string;
        acquirerCode: string;
        number: string;
        cardType: string;
        ownerType: string;
    };
}

/** 자동결제 승인(실제 청구) 응답 — Payment 객체 일부 */
export interface TossBillingChargeResponse {
    mId: string;
    version: string;
    paymentKey: string;
    status: 'DONE' | 'FAILED' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED' | 'IN_PROGRESS';
    orderId: string;
    orderName: string;
    requestedAt: string;
    approvedAt: string;
    type: 'BILLING' | 'NORMAL';
    totalAmount: number;
    balanceAmount: number;
    method: string;
    card?: {
        issuerCode: string;
        acquirerCode: string;
        number: string;
        installmentPlanMonths: number;
        approveNo: string;
        cardType: string;
        ownerType: string;
        acquireStatus: string;
        amount: number;
    };
    failure?: {
        code: string;
        message: string;
    };
    receipt?: {
        url: string;
    };
}

/** 에러 응답 */
export interface TossErrorResponse {
    code: string;
    message: string;
}

/** 서버 내부 결과 래퍼 */
export interface TossBillingChargeResult {
    success: boolean;
    paymentKey?: string;
    orderId?: string;
    approvedAt?: string;
    errorCode?: string;
    errorMessage?: string;
    raw?: TossBillingChargeResponse | TossErrorResponse;
}

export interface TossBillingIssueResult {
    success: boolean;
    billingKey?: string;
    customerKey?: string;
    cardCompany?: string;
    cardNumber?: string;
    errorCode?: string;
    errorMessage?: string;
    raw?: TossBillingKeyIssueResponse | TossErrorResponse;
}
