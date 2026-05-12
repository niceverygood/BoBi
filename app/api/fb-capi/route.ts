// app/api/fb-capi/route.ts
//
// 클라이언트 픽셀에서 발생한 이벤트를 서버 CAPI로 전송하는 프록시.
// trackConversion() 호출 시 자동으로 여기로 들어옴.
//
// 보안:
//   - 익명 호출 허용 (광고 트래킹 특성상 비로그인 사용자도 추적).
//   - userId·email·phoneNo는 사용자가 직접 자기 정보만 보냄 (PII 해시는 서버에서).
//   - 토큰 등 민감 정보는 응답에 포함 안 함.
//
// ENV 미설정 시 200 OK + skipped:true 응답 — 클라이언트는 정상 처리.

import { NextResponse } from 'next/server';
import { sendFbCapiEvent, type FbStandardEvent } from '@/lib/analytics/fb-capi';

export const dynamic = 'force-dynamic';

interface RequestBody {
    event: FbStandardEvent;
    eventId: string;
    value?: number;
    currency?: string;
    email?: string;
    phoneNo?: string;
    userId?: string;
    customData?: Record<string, unknown>;
    eventSourceUrl?: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RequestBody;

        if (!body?.event || !body?.eventId) {
            return NextResponse.json({ error: 'event, eventId 필수' }, { status: 400 });
        }

        // 클라이언트 IP와 User-Agent를 매칭 정확도 향상에 사용
        const headers = request.headers;
        const clientIp =
            headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headers.get('x-real-ip') ||
            undefined;
        const clientUserAgent = headers.get('user-agent') || undefined;

        // fbc(_fbc), fbp(_fbp) 쿠키 — Meta가 매칭 정확도 향상에 사용
        const cookieHeader = headers.get('cookie') || '';
        const fbc = cookieHeader.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1];
        const fbp = cookieHeader.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1];

        const result = await sendFbCapiEvent({
            event: body.event,
            eventId: body.eventId,
            value: body.value,
            currency: body.currency,
            email: body.email,
            phoneNo: body.phoneNo,
            userId: body.userId,
            customData: body.customData,
            eventSourceUrl: body.eventSourceUrl,
            clientIp,
            clientUserAgent,
            fbc,
            fbp,
        });

        return NextResponse.json({ ok: result.ok, reason: result.reason });
    } catch (err) {
        // 광고 트래킹 실패가 사용자 플로우를 막으면 안 됨 — 항상 200 응답.
        console.warn('[fb-capi route] 예외:', (err as Error).message);
        return NextResponse.json({ ok: false, reason: 'exception' });
    }
}
