// lib/solapi/client.ts
//
// SOLAPI v4 알림톡(카카오 비즈메시지) 발송 클라이언트.
//
// 알리고에서 솔라피로 마이그레이션한 이유 (이종인 5/13):
//   - Vercel 서버리스 함수의 동적 IP 때문에 알리고의 IP 화이트리스트 검증에 막힘.
//   - 솔라피는 HMAC SHA256 + API Key/Secret 기반이라 IP 무관 — Vercel 호환.
//
// 환경변수:
//   SOLAPI_API_KEY        : API Key (예: NCSYKXBQX2IZQ2FC)
//   SOLAPI_API_SECRET     : API Secret
//   SOLAPI_PFID           : 카카오 비즈니스 채널 프로필 ID (KA01PF... 형식)
//   SOLAPI_SENDER_NUMBER  : SMS 대체발송용 발신번호 (예: 07041479771)
//
// 검수 노트:
//   ALIGO 에 있던 12종 템플릿(future_me / medical / risk / receipt / crm) 은
//   솔라피에서 다시 등록 + 카카오 검수 받아야 함. ID 가 변경됨.
//   환경변수 SOLAPI_TPL_* 에 새 ID 채워야 발송 가능.
//
// API 스펙:
//   POST https://api.solapi.com/messages/v4/send
//   Headers:
//     Authorization: HMAC-SHA256 apiKey=KEY, date=YYYYMMDDTHHmmssZ, salt=RANDOM, signature=HMAC
//     Content-Type: application/json
//   signature = HMAC-SHA256(secret).update(date + salt).hex()

import crypto from 'crypto';

const SOLAPI_BASE = 'https://api.solapi.com';

export interface SolapiButton {
    /** WL=웹링크, AL=앱링크, BK=봇키워드, MD=메시지전달, BC=상담톡전환 */
    buttonType: 'WL' | 'AL' | 'BK' | 'MD' | 'BC';
    buttonName: string;
    linkMo?: string;   // 모바일 URL
    linkPc?: string;   // PC URL
    linkAnd?: string;  // Android scheme
    linkIos?: string;  // iOS scheme
}

export interface SendAlimtalkOptions {
    /** 솔라피·카카오 검수 통과 템플릿 ID (예: KA01TP...) */
    templateId: string;
    receiverPhone: string;
    /** 템플릿 변수 치환 — { '#{name}': '한승수' } 형식.
        템플릿 본문에 #{변수명} 형태로 박혀 있던 자리에 치환됨. */
    variables?: Record<string, string>;
    /** SMS 대체발송용 본문 (알림톡 실패 시 SMS 로 발송될 텍스트). */
    smsFallbackText?: string;
    /** SMS 대체발송용 제목 (LMS 용, 30자 이내). */
    smsFallbackSubject?: string;
    buttons?: SolapiButton[];
    /** SMS 대체발송 비활성 (default false = 자동 SMS 발송). */
    disableSms?: boolean;
}

export interface SolapiSendResult {
    /** 솔라피 메시지 그룹 ID */
    groupId: string;
    /** 솔라피 메시지 ID */
    messageId: string;
    statusCode: string;
    statusMessage: string;
}

function getCreds() {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const pfId = process.env.SOLAPI_PFID;
    const sender = process.env.SOLAPI_SENDER_NUMBER;

    if (!apiKey || !apiSecret || !pfId || !sender) {
        throw new Error(
            'SOLAPI 환경변수 누락: SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_PFID / SOLAPI_SENDER_NUMBER',
        );
    }
    return { apiKey, apiSecret, pfId, sender };
}

export function normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
}

export function isValidKoreanPhone(phone: string): boolean {
    const digits = normalizePhone(phone);
    return /^01[016789]\d{7,8}$/.test(digits);
}

/**
 * 솔라피 HMAC 인증 헤더 생성.
 * signature = HMAC-SHA256(secret).update(date + salt).hex()
 */
function buildAuthHeader(apiKey: string, apiSecret: string): string {
    // ISO 8601 형식의 UTC 시간 (마이크로초 X)
    const date = new Date().toISOString();
    // 12~64자 랜덤 salt
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(date + salt)
        .digest('hex');
    return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 알림톡 1건 발송. 실패 시 throw.
 *
 * ⚠️ templateId 가 솔라피 검수 미통과면 실패 응답 → throw.
 *    호출 측에서 catch 후 "검수 진행 중" 안내 표시.
 */
export async function sendAlimtalk(opts: SendAlimtalkOptions): Promise<SolapiSendResult> {
    const creds = getCreds();
    const phone = normalizePhone(opts.receiverPhone);

    if (!isValidKoreanPhone(phone)) {
        throw new Error(`유효하지 않은 휴대폰 번호: ${opts.receiverPhone}`);
    }

    // 알림톡 본문은 솔라피가 template 에서 자동 치환하므로 'text' 는 SMS 대체용.
    const fallbackText = (opts.smsFallbackText || '').slice(0, 1000);

    const message: Record<string, unknown> = {
        to: phone,
        from: creds.sender,
        type: 'ATA',  // 알림톡 (Alim Talk Anonymous? - 솔라피 표준)
        kakaoOptions: {
            pfId: creds.pfId,
            templateId: opts.templateId,
            ...(opts.variables ? { variables: opts.variables } : {}),
            ...(opts.buttons && opts.buttons.length > 0 ? { buttons: opts.buttons } : {}),
            disableSms: opts.disableSms === true,
        },
        ...(fallbackText ? { text: fallbackText } : {}),
        ...(opts.smsFallbackSubject ? { subject: opts.smsFallbackSubject.slice(0, 30) } : {}),
    };

    const body = JSON.stringify({ message });

    const response = await fetch(`${SOLAPI_BASE}/messages/v4/send`, {
        method: 'POST',
        headers: {
            'Authorization': buildAuthHeader(creds.apiKey, creds.apiSecret),
            'Content-Type': 'application/json',
        },
        body,
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        // 솔라피 에러 응답 예: { errorCode: "...", errorMessage: "..." }
        let parsed: { errorCode?: string; errorMessage?: string } = {};
        try { parsed = JSON.parse(errText); } catch { /* not json */ }
        throw new Error(
            `SOLAPI HTTP ${response.status}: ${parsed.errorMessage || errText || 'unknown error'}`,
        );
    }

    const data = await response.json() as {
        groupId: string;
        messageId: string;
        statusCode: string;
        statusMessage: string;
    };

    // 솔라피 성공 상태 코드: "2000" (정상 접수)
    // 실패 상태는 statusCode 에 "3xxx" 또는 "4xxx" 가 들어옴.
    if (data.statusCode && !data.statusCode.startsWith('2')) {
        throw new Error(`SOLAPI 발송 실패 (status ${data.statusCode}): ${data.statusMessage}`);
    }

    return {
        groupId: data.groupId,
        messageId: data.messageId,
        statusCode: data.statusCode,
        statusMessage: data.statusMessage,
    };
}
