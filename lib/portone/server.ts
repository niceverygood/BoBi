// 포트원 V2 서버 API 유틸리티
// https://developers.portone.io/opi/ko/api/billing-key-payment/pay-with-billing-key

const PORTONE_API_BASE = 'https://api.portone.io';

interface PortOneTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface BillingKeyPaymentRequest {
    billingKey: string;
    paymentId: string;
    orderName: string;
    amount: number;
    currency?: string;
    channelKey?: string;
    customer?: {
        id?: string;
        email?: string;
        name?: string;
        phoneNumber?: string;
    };
}

interface BillingKeyPaymentResponse {
    success: boolean;
    paymentId?: string;
    error?: string;
    status?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

// 포트원 V2 액세스 토큰 발급 (캐싱)
async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token;
    }

    const apiSecret = process.env.PORTONE_API_SECRET;
    if (!apiSecret) throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.');

    const response = await fetch(`${PORTONE_API_BASE}/login/api-secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiSecret }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`포트원 토큰 발급 실패: ${response.status} ${errText}`);
    }

    const data: PortOneTokenResponse = await response.json();
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 - 60000 : 1800000),
    };
    return data.access_token;
}

// 빌링키로 결제 실행
export async function payWithBillingKey(params: BillingKeyPaymentRequest): Promise<BillingKeyPaymentResponse> {
    try {
        const accessToken = await getAccessToken();

        const requestBody: Record<string, unknown> = {
            billingKey: params.billingKey,
            orderName: params.orderName,
            amount: {
                total: params.amount,
            },
            currency: params.currency || 'KRW',
        };

        // 이니시스 V2 등 일부 PG는 빌링키 결제 시 channelKey 명시 필요
        if (params.channelKey) {
            requestBody.channelKey = params.channelKey;
        }

        // customer 정보는 이니시스 V2 결제 내역 조회/재발행에 필요
        if (params.customer) {
            requestBody.customer = params.customer;
        }

        const response = await fetch(
            `${PORTONE_API_BASE}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[PortOne] 빌링키 결제 실패:', {
                status: response.status,
                paymentId: params.paymentId,
                error: errorData,
            });
            return {
                success: false,
                error: errorData.message || errorData.code || `결제 실패 (${response.status})`,
                status: 'FAILED',
            };
        }

        const data = await response.json();

        return {
            success: true,
            paymentId: params.paymentId,
            status: data.status || 'PAID',
        };
    } catch (error) {
        console.error('[PortOne] 빌링키 결제 예외:', error);
        return {
            success: false,
            error: (error as Error).message,
            status: 'FAILED',
        };
    }
}

// 결제 상태 조회
export async function getPaymentStatus(paymentId: string): Promise<{ status: string; paidAt?: string }> {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(
            `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            return { status: 'UNKNOWN' };
        }

        const data = await response.json();
        return {
            status: data.status,
            paidAt: data.paidAt,
        };
    } catch {
        return { status: 'UNKNOWN' };
    }
}
