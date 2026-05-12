// lib/analytics/fb-capi.ts
//
// Meta Conversions API (서버 사이드 전환 추적).
//
// 왜 필요?
//   iOS 14.5+ ATT, iOS 17+ Link Tracking Protection, 브라우저 트래커 차단(adblock·Brave 등)으로
//   클라이언트 픽셀만으로는 전환의 30~60%가 누락됨. 서버에서 같은 이벤트를 동일 event_id로
//   한 번 더 보내면 Meta가 dedup 처리해 중복 없이 정확도만 ↑.
//
// 환경변수:
//   NEXT_PUBLIC_FB_PIXEL_ID      — 광고 픽셀 ID (양쪽 공유)
//   FB_CAPI_ACCESS_TOKEN         — 이벤트 매니저 → 픽셀 설정 → CAPI에서 발급
//   FB_CAPI_TEST_EVENT_CODE      — (선택) 테스트 이벤트 코드. 운영에서는 비워둠.
//
// 모두 비어 있으면 sendFbCapiEvent()는 no-op으로 즉시 반환.

import crypto from 'crypto';

const GRAPH_VERSION = 'v18.0';

export type FbStandardEvent =
    | 'PageView' | 'CompleteRegistration' | 'StartTrial' | 'Subscribe'
    | 'Lead' | 'Purchase' | 'InitiateCheckout' | 'AddPaymentInfo' | 'ViewContent';

export interface FbCapiEvent {
    event: FbStandardEvent;
    /** 클라이언트 픽셀과 동일하게 보내 dedup 처리 */
    eventId: string;
    /** 결제 이벤트 거래 금액 */
    value?: number;
    currency?: string;
    /** PII — 서버에서 SHA256 해시 후 user_data로 전달 */
    email?: string;
    phoneNo?: string;
    userId?: string;
    /** 추가 컨텍스트 (action_source 추적, IP, User-Agent 등) */
    eventSourceUrl?: string;
    clientIp?: string;
    clientUserAgent?: string;
    /** Meta가 권장하는 fbc(클릭 ID 쿠키), fbp(브라우저 ID 쿠키) — 매칭 정확도 ↑ */
    fbc?: string;
    fbp?: string;
    /** 자유 속성 */
    customData?: Record<string, unknown>;
}

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(phoneNo: string): string {
    // E.164 권장: +82-10-... → 821012345678 (숫자만, 국가코드 포함)
    const digits = phoneNo.replace(/\D/g, '');
    if (digits.startsWith('010')) return '82' + digits.slice(1);
    return digits;
}

/**
 * Meta Conversions API에 이벤트 전송.
 * 환경변수 누락 시 즉시 반환 (no-op).
 * 실패해도 throw 하지 않음 — 서버 흐름 막지 않게.
 */
export async function sendFbCapiEvent(ev: FbCapiEvent): Promise<{ ok: boolean; reason?: string }> {
    const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
    const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;
    const testEventCode = process.env.FB_CAPI_TEST_EVENT_CODE;

    if (!pixelId || !accessToken) {
        // ENV 안 채워진 상태 — 정상 (사일런트 스킵). 디버그 시에만 로그.
        if (process.env.FB_CAPI_DEBUG === '1') {
            console.log('[fb-capi] ENV 미설정으로 스킵', { event: ev.event });
        }
        return { ok: false, reason: 'env-not-set' };
    }

    const userData: Record<string, string | string[]> = {};
    if (ev.email) userData.em = [sha256(ev.email)];
    if (ev.phoneNo) userData.ph = [sha256(normalizePhone(ev.phoneNo))];
    if (ev.userId) userData.external_id = [sha256(ev.userId)];
    if (ev.clientIp) userData.client_ip_address = ev.clientIp;
    if (ev.clientUserAgent) userData.client_user_agent = ev.clientUserAgent;
    if (ev.fbc) userData.fbc = ev.fbc;
    if (ev.fbp) userData.fbp = ev.fbp;

    const customData: Record<string, unknown> = { ...(ev.customData || {}) };
    if (ev.value !== undefined) {
        customData.value = ev.value;
        customData.currency = ev.currency || 'KRW';
    }

    const payload = {
        data: [{
            event_name: ev.event,
            event_time: Math.floor(Date.now() / 1000),
            event_id: ev.eventId,
            action_source: 'website',
            event_source_url: ev.eventSourceUrl,
            user_data: userData,
            custom_data: customData,
        }],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    try {
        const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            console.warn('[fb-capi] non-2xx 응답:', res.status, text.slice(0, 300));
            return { ok: false, reason: `http-${res.status}` };
        }
        return { ok: true };
    } catch (err) {
        console.warn('[fb-capi] fetch 실패:', (err as Error).message);
        return { ok: false, reason: (err as Error).message };
    }
}
