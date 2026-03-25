// 카카오페이 정기결제 API 클라이언트
// https://developers.kakaopay.com/docs/payment/online/subscription

const KAKAOPAY_API_BASE = 'https://open-api.kakaopay.com/online/v1/payment';

// 정기결제 CID (프로덕션용은 카카오페이에서 별도 발급)
const CID = process.env.KAKAOPAY_CID || 'TCSUBSCRIP'; // 테스트: TCSUBSCRIP

function getSecretKey(): string {
    const key = process.env.KAKAOPAY_SECRET_KEY;
    if (!key) throw new Error('KAKAOPAY_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return key;
}

function getHeaders() {
    return {
        'Authorization': `SECRET_KEY ${getSecretKey()}`,
        'Content-Type': 'application/json',
    };
}

// ── 1. 정기결제 준비 (Ready) ────────────────────────────
export interface KakaoPayReadyRequest {
    partnerOrderId: string;
    partnerUserId: string;
    itemName: string;
    totalAmount: number;
    taxFreeAmount?: number;
}

export interface KakaoPayReadyResponse {
    tid: string;
    next_redirect_app_url: string;
    next_redirect_mobile_url: string;
    next_redirect_pc_url: string;
    android_app_scheme: string;
    ios_app_scheme: string;
    created_at: string;
}

export async function kakaoPayReady(params: KakaoPayReadyRequest): Promise<KakaoPayReadyResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.bobi.co.kr';

    const body = {
        cid: CID,
        partner_order_id: params.partnerOrderId,
        partner_user_id: params.partnerUserId,
        item_name: params.itemName,
        quantity: 1,
        total_amount: params.totalAmount,
        tax_free_amount: params.taxFreeAmount || 0,
        approval_url: `${baseUrl}/api/kakaopay/approve?partner_order_id=${params.partnerOrderId}&partner_user_id=${params.partnerUserId}`,
        cancel_url: `${baseUrl}/dashboard/subscribe?status=cancel`,
        fail_url: `${baseUrl}/dashboard/subscribe?status=fail`,
    };

    const response = await fetch(`${KAKAOPAY_API_BASE}/subscription/ready`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error_message || errData.msg || `카카오페이 결제 준비 실패 (${response.status})`);
    }

    return response.json();
}

// ── 2. 정기결제 승인 (Approve) ──────────────────────────
export interface KakaoPayApproveRequest {
    tid: string;
    partnerOrderId: string;
    partnerUserId: string;
    pgToken: string;
}

export interface KakaoPayApproveResponse {
    aid: string;
    tid: string;
    cid: string;
    sid: string; // 정기결제 SID (= 빌링키)
    partner_order_id: string;
    partner_user_id: string;
    payment_method_type: string;
    amount: {
        total: number;
        tax_free: number;
        vat: number;
    };
    item_name: string;
    created_at: string;
    approved_at: string;
}

export async function kakaoPayApprove(params: KakaoPayApproveRequest): Promise<KakaoPayApproveResponse> {
    const body = {
        cid: CID,
        tid: params.tid,
        partner_order_id: params.partnerOrderId,
        partner_user_id: params.partnerUserId,
        pg_token: params.pgToken,
    };

    const response = await fetch(`${KAKAOPAY_API_BASE}/subscription/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error_message || errData.msg || `카카오페이 결제 승인 실패 (${response.status})`);
    }

    return response.json();
}

// ── 3. SID로 정기결제 (Subscription) ────────────────────
export interface KakaoPaySubscriptionRequest {
    sid: string;
    partnerOrderId: string;
    partnerUserId: string;
    itemName: string;
    totalAmount: number;
    taxFreeAmount?: number;
}

export interface KakaoPaySubscriptionResponse {
    aid: string;
    tid: string;
    cid: string;
    sid: string; // 갱신된 SID
    partner_order_id: string;
    partner_user_id: string;
    payment_method_type: string;
    amount: {
        total: number;
        tax_free: number;
        vat: number;
    };
    item_name: string;
    created_at: string;
    approved_at: string;
}

export async function kakaoPaySubscription(params: KakaoPaySubscriptionRequest): Promise<KakaoPaySubscriptionResponse> {
    const body = {
        cid: CID,
        sid: params.sid,
        partner_order_id: params.partnerOrderId,
        partner_user_id: params.partnerUserId,
        item_name: params.itemName,
        quantity: 1,
        total_amount: params.totalAmount,
        tax_free_amount: params.taxFreeAmount || 0,
    };

    const response = await fetch(`${KAKAOPAY_API_BASE}/subscription`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error_message || errData.msg || `카카오페이 정기결제 실패 (${response.status})`);
    }

    return response.json();
}

// ── 4. 정기결제 비활성화 ────────────────────────────────
export async function kakaoPayInactivate(sid: string): Promise<void> {
    const response = await fetch(`${KAKAOPAY_API_BASE}/subscription/inactivate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            cid: CID,
            sid,
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error_message || errData.msg || `카카오페이 정기결제 비활성화 실패 (${response.status})`);
    }
}

// ── 5. 정기결제 상태 조회 ───────────────────────────────
export async function kakaoPayStatus(sid: string): Promise<{ status: string; available_at?: string }> {
    const response = await fetch(`${KAKAOPAY_API_BASE}/subscription/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            cid: CID,
            sid,
        }),
    });

    if (!response.ok) {
        return { status: 'UNKNOWN' };
    }

    const data = await response.json();
    return {
        status: data.status || 'UNKNOWN',
        available_at: data.available_at,
    };
}
