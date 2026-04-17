// lib/inicis/server.ts
// KG이니시스 INIpay Standard 빌링키 발급 + INIAPI 빌링 승인 서버 로직
//
// 환경변수:
//   INICIS_MID                (예: MOIbobi998)
//   INICIS_SIGN_KEY           INIpay Standard 웹결제 signkey
//   INICIS_API_KEY            INIAPI Key
//   INICIS_API_IV             INIAPI IV (AES256 암호화 필요 시)
//   INICIS_MODE               'production' (기본) | 'test'

import {
    sha256Hex,
    sha512Hex,
    inicisTimestamp,
    inicisMsTimestamp,
    generateInicisOid,
} from './hash';
import type {
    InicisBillingKeyFormParams,
    InicisBillingKeyIssueResult,
    InicisBillingApproveResult,
} from './types';

// ──────────────────────────────────────────────────────────────
// 환경변수
// ──────────────────────────────────────────────────────────────
interface InicisEnv {
    mid: string;
    signKey: string;
    apiKey: string;
    apiIv?: string;
    mode: 'production' | 'test';
}

function getEnv(): InicisEnv {
    const mid = process.env.INICIS_MID;
    const signKey = process.env.INICIS_SIGN_KEY;
    const apiKey = process.env.INICIS_API_KEY;
    const apiIv = process.env.INICIS_API_IV;
    const mode = (process.env.INICIS_MODE || 'production') as 'production' | 'test';

    if (!mid || !signKey || !apiKey) {
        throw new Error(
            'INICIS 환경변수 누락: INICIS_MID / INICIS_SIGN_KEY / INICIS_API_KEY 필요',
        );
    }
    return { mid, signKey, apiKey, apiIv, mode };
}

function apiBaseHost(): string {
    return getEnv().mode === 'test' ? 'stginiapi.inicis.com' : 'iniapi.inicis.com';
}

// ──────────────────────────────────────────────────────────────
// 1) 빌링키 발급 — 클라이언트 폼 파라미터 생성
//    (INIpay Standard JS SDK 로드 → INIStdPay.pay('form_id') 제출)
// ──────────────────────────────────────────────────────────────
export interface BuildBillingKeyFormInput {
    /** 상품/플랜명 */
    goodName: string;
    /** 구매자 */
    buyerName: string;
    buyerTel: string;
    buyerEmail: string;
    /** returnUrl — INIpay가 결과를 POST할 URL (서버) */
    returnUrl: string;
    /** closeUrl — 창 닫기 시 이동 URL */
    closeUrl: string;
    /** 내부 사용자 식별/플랜/쿠폰 등 (URL-safe base64 등으로 직렬화해서 전달) */
    merchantData?: string;
    /** 앱카드/ISP/간편결제 활성화 여부 */
    enableAppCard?: boolean;
    enableIsp?: boolean;
    enableEasyPay?: boolean;
    /** 빌링키 발급 표시용 금액 (실제 청구 안됨). 기본 100원 */
    displayPrice?: number;
}

export function buildBillingKeyForm(input: BuildBillingKeyFormInput): InicisBillingKeyFormParams {
    const { mid, signKey } = getEnv();
    const oid = generateInicisOid('billing');
    const priceStr = String(input.displayPrice ?? 100);
    const timestamp = inicisMsTimestamp();

    // signature = SHA256(oid + price + timestamp)
    const signature = sha256Hex(`oid=${oid}&price=${priceStr}&timestamp=${timestamp}`);
    // verification = SHA256(oid + price + signkey + timestamp)
    const verification = sha256Hex(
        `oid=${oid}&price=${priceStr}&signKey=${signKey}&timestamp=${timestamp}`,
    );
    // mKey = SHA256(signkey)
    const mKey = sha256Hex(signKey);

    // acceptmethod: 빌링키 발급 + 추가 옵션
    //
    // ⚠️ 주의: 아래 파라미터는 "가맹점 계약"이 되어 있어야만 결제창에 실제로 노출됨.
    // 계약이 안 된 결제수단은 파라미터를 넣어도 무시됨.
    // KG이니시스 담당자에게 MID(MOIbobi998)에 각 결제수단 계약 여부 확인 필요.
    const acceptParts: string[] = ['BILLAUTH(Card)'];
    if (input.enableAppCard !== false) acceptParts.push('useappcard(Y)');    // 앱카드 (신한/삼성/KB/현대/하나/롯데/NH/BC 등)
    if (input.enableIsp !== false) acceptParts.push('useisp(Y)');            // ISP/안심클릭
    if (input.enableEasyPay !== false) acceptParts.push('noeasypay(N)');     // 간편결제 (네이버페이/토스페이/페이코/카카오페이)
    const acceptmethod = acceptParts.join(':');

    return {
        version: '1.0',
        gopaymethod: 'Card',
        mid,
        oid,
        price: priceStr,
        timestamp,
        use_chkfake: 'Y',
        signature,
        verification,
        mKey,
        currency: 'WON',
        goodname: input.goodName.slice(0, 40),
        buyername: input.buyerName.slice(0, 30),
        buyertel: input.buyerTel,
        buyeremail: input.buyerEmail,
        returnUrl: input.returnUrl,
        closeUrl: input.closeUrl,
        acceptmethod,
        merchantData: input.merchantData,
    };
}

// ──────────────────────────────────────────────────────────────
// 2) returnUrl 콜백 — authToken + authUrl을 받아 승인 요청
//    (INIpay가 POST로 보내준 값을 이 함수에 전달하면 최종 빌링키 반환)
// ──────────────────────────────────────────────────────────────
export interface ApproveBillingKeyInput {
    authToken: string;
    authUrl: string;
    netCancelUrl?: string;
    oid: string;
}

export async function approveBillingKeyIssue(
    input: ApproveBillingKeyInput,
): Promise<InicisBillingKeyIssueResult> {
    const { mid, signKey } = getEnv();
    const timestamp = inicisMsTimestamp();
    // signature = SHA256(authToken + signKey + timestamp)
    const signature = sha256Hex(
        `authToken=${input.authToken}&signKey=${signKey}&timestamp=${timestamp}`,
    );
    // verification = SHA256(authToken + signKey + timestamp)  — 일부 문서에 동일
    const verification = signature;

    const form = new URLSearchParams();
    form.set('mid', mid);
    form.set('authToken', input.authToken);
    form.set('timestamp', timestamp);
    form.set('signature', signature);
    form.set('verification', verification);
    form.set('charset', 'UTF-8');
    form.set('format', 'JSON');

    const response = await fetch(input.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
    });

    if (!response.ok) {
        throw new Error(`INIpay authUrl HTTP ${response.status}`);
    }
    const json = (await response.json()) as Record<string, unknown>;

    return {
        resultCode: String(json.resultCode ?? ''),
        resultMsg: String(json.resultMsg ?? ''),
        mid: json.mid as string | undefined,
        MOID: json.MOID as string | undefined,
        billKey: (json.billKey || json.BILL_KEY || json.tid) as string | undefined,
        authDate: json.authDate as string | undefined,
        authTime: json.authTime as string | undefined,
        CARD_Num: json.CARD_Num as string | undefined,
        CARD_Code: json.CARD_Code as string | undefined,
        CARD_BankCode: json.CARD_BankCode as string | undefined,
        CARD_Interest: json.CARD_Interest as string | undefined,
        CARD_Quota: json.CARD_Quota as string | undefined,
    };
}

// ──────────────────────────────────────────────────────────────
// 3) INIAPI 빌링 승인 — 실제 결제 청구
// ──────────────────────────────────────────────────────────────
export interface ChargeBillkeyInput {
    billKey: string;
    price: number;              // 원 (정수)
    goodName: string;
    buyerName: string;
    buyerEmail: string;
    buyerTel?: string;
    /** 가맹점 주문번호 (unique) */
    moid?: string;
    /** 가맹점 URL (INIAPI 필수) */
    merchantUrl?: string;
    clientIp?: string;
}

export async function chargeBillkey(input: ChargeBillkeyInput): Promise<InicisBillingApproveResult> {
    const { mid, apiKey } = getEnv();
    const timestamp = inicisTimestamp();
    const moid = input.moid || generateInicisOid('charge');
    const clientIp = input.clientIp || '127.0.0.1';

    // INIAPI data payload
    const data = {
        url: input.merchantUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.bobi.co.kr',
        moid,
        goodName: input.goodName,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerTel: input.buyerTel || '',
        price: String(input.price),
        billKey: input.billKey,
        authentification: '00',
    };
    const dataJson = JSON.stringify(data);
    // hashData = SHA512(INIAPIKey + mid + type + timestamp + data)
    const hashData = sha512Hex(apiKey + mid + 'billing' + timestamp + dataJson);

    const body = {
        mid,
        type: 'billing',
        paymethod: 'Card',
        timestamp,
        clientIp,
        hashData,
        data,
    };

    const url = `https://${apiBaseHost()}/api/v1/billing`;

    let json: Record<string, unknown>;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return {
                success: false,
                resultCode: `HTTP_${res.status}`,
                resultMsg: `INIAPI HTTP ${res.status}: ${txt.slice(0, 200)}`,
            };
        }
        json = (await res.json()) as Record<string, unknown>;
    } catch (err) {
        return {
            success: false,
            resultCode: 'NETWORK_ERROR',
            resultMsg: (err as Error).message,
        };
    }

    const resultCode = String(json.resultCode ?? '');
    const resultMsg = String(json.resultMsg ?? '');
    const ok = resultCode === '00';

    return {
        success: ok,
        resultCode,
        resultMsg,
        tid: json.tid as string | undefined,
        payAuthCode: json.payAuthCode as string | undefined,
        payDate: json.payDate as string | undefined,
        payTime: json.payTime as string | undefined,
        price: json.price as string | undefined,
        cardCode: json.cardCode as string | undefined,
        cardQuota: json.cardQuota as string | undefined,
        checkFlg: json.checkFlg as string | undefined,
        raw: json,
    };
}

// ──────────────────────────────────────────────────────────────
// 4) INIpay Standard JS SDK URL (프론트에서 로드)
// ──────────────────────────────────────────────────────────────
export function getInipayScriptUrl(): string {
    const { mode } = getEnv();
    return mode === 'test'
        ? 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
        : 'https://stdpay.inicis.com/stdjs/INIStdPay.js';
}
