// lib/inicis/types.ts
// KG이니시스 직접 연동 타입

/** 빌링키 발급 요청 — 클라이언트 폼으로 넘길 파라미터 */
export interface InicisBillingKeyFormParams {
    version: '1.0';
    gopaymethod: 'Card';
    mid: string;
    oid: string;
    /** BILLAUTH은 실제 청구 없음. 0원 ~ 100원 사이로 설정 (표시용) */
    price: string;
    timestamp: string;
    use_chkfake: 'Y';
    signature: string;
    verification: string;
    mKey: string;
    currency: 'WON';
    goodname: string;
    buyername: string;
    buyertel: string;
    buyeremail: string;
    returnUrl: string;
    closeUrl: string;
    /** BILLAUTH(Card) — 빌링키 발급 모드 */
    acceptmethod: string;
    /** 앱카드/ISP/간편결제 노출 제어 */
    P_RESERVED?: string;
    /** 결과 페이지에서 넘겨받을 임의 값 */
    merchantData?: string;
}

/** returnUrl (server-side) 에 이니시스가 POST하는 BILLAUTH 결과 */
export interface InicisBillingKeyReturn {
    resultCode: string;       // '0000' = 성공
    resultMsg: string;
    mid: string;
    orderNumber: string;      // oid
    authToken?: string;
    authUrl?: string;         // 승인 요청 URL (billkey 발급 승인용)
    netCancelUrl?: string;
    charset?: string;
    merchantData?: string;
    idc_name?: string;
    authType?: string;
}

/** authUrl로 POST 후 받는 최종 빌링키 결과 */
export interface InicisBillingKeyIssueResult {
    resultCode: string;
    resultMsg: string;
    mid?: string;
    MOID?: string;
    /** 빌링키 (TID와 유사하지만 빌링키 전용) */
    billKey?: string;
    authDate?: string;
    authTime?: string;
    CARD_Num?: string;
    CARD_Code?: string;
    CARD_BankCode?: string;
    CARD_Interest?: string;
    CARD_Quota?: string;
}

/** INIAPI 빌링 승인(실제 청구) 응답 */
export interface InicisBillingApproveResult {
    success: boolean;
    resultCode: string;
    resultMsg: string;
    tid?: string;
    payAuthCode?: string;
    payDate?: string;
    payTime?: string;
    price?: string;
    cardCode?: string;
    cardQuota?: string;
    checkFlg?: string;
    raw?: unknown;
}

/** 클라이언트-서버 간 빌링키 발급 세션 메타 (DB 또는 임시저장) */
export interface InicisPendingBillingKey {
    oid: string;
    user_id: string;
    plan_slug: string;
    billing_cycle: 'monthly' | 'yearly';
    coupon_code: string | null;
    price: number;
    buyer_name: string;
    buyer_email: string;
    buyer_tel: string;
    created_at: string;
}
