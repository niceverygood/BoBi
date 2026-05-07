// lib/share/token.ts
//
// 4종 리포트(future-me / medical / risk-report / accident-receipt)에 모두 쓰이는
// 공유 토큰 발급·검증 헬퍼. HMAC-SHA256 서명 + 페이로드 임베드 방식이라 DB 컬럼
// 추가가 필요 없다. 기존 lib/future-me/share-token.ts와 호환되는 토큰 형식이지만
// kind 필드를 추가해 리포트 종류를 식별한다.

import crypto from 'crypto';

export type ShareKind = 'future-me' | 'medical' | 'risk-report' | 'accident-receipt';

interface TokenPayload {
    /** 리포트 종류 */
    k: ShareKind;
    /** 리포트 ID (테이블별 PK) */
    r: string;
    /** issued at (unix sec) */
    i: number;
    /** expires at (unix sec) */
    e: number;
    /** issuer user id */
    u: string;
}

function getSecret(): string {
    const s = process.env.SHARE_TOKEN_SECRET
        || process.env.FUTURE_ME_SHARE_SECRET
        || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('SHARE_TOKEN_SECRET 환경변수가 필요합니다.');
    return s;
}

function base64urlEncode(buf: Buffer | string): string {
    return Buffer.from(buf).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(data: string): string {
    return base64urlEncode(crypto.createHmac('sha256', getSecret()).update(data).digest());
}

/** 공유 토큰 발급 — 기본 7일 유효 */
export function issueShareToken(args: {
    kind: ShareKind;
    resourceId: string;
    userId: string;
    ttlSec?: number;
}): string {
    const { kind, resourceId, userId } = args;
    const ttlSec = args.ttlSec ?? 60 * 60 * 24 * 7;
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = { k: kind, r: resourceId, i: now, e: now + ttlSec, u: userId };
    const body = base64urlEncode(JSON.stringify(payload));
    const sig = sign(body);
    return `${body}.${sig}`;
}

export interface VerifiedShareToken {
    kind: ShareKind;
    resourceId: string;
    issuerUserId: string;
    issuedAt: number;
    expiresAt: number;
}

export function verifyShareToken(token: string, expectedKind?: ShareKind): VerifiedShareToken {
    const parts = (token || '').split('.');
    if (parts.length !== 2) throw new Error('토큰 형식 오류');
    const [body, sig] = parts;

    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error('토큰 서명 검증 실패');
    }

    let payload: TokenPayload;
    try {
        payload = JSON.parse(base64urlDecode(body).toString('utf8'));
    } catch {
        throw new Error('토큰 페이로드 파싱 실패');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.e < now) throw new Error('토큰이 만료되었습니다');

    if (expectedKind && payload.k !== expectedKind) {
        throw new Error(`잘못된 토큰 종류: ${payload.k} (예상: ${expectedKind})`);
    }

    return {
        kind: payload.k,
        resourceId: payload.r,
        issuerUserId: payload.u,
        issuedAt: payload.i,
        expiresAt: payload.e,
    };
}

/** future-me 전용 호환 헬퍼 — 기존 lib/future-me/share-token.ts 시그니처 유지 */
export function issueFutureMeShareToken(reportId: string, userId: string, ttlSec?: number): string {
    return issueShareToken({ kind: 'future-me', resourceId: reportId, userId, ttlSec });
}
