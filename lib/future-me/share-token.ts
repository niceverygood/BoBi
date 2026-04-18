// lib/future-me/share-token.ts
// HMAC-SHA256 서명 기반 공유 토큰 (DB 추가 컬럼 없이 토큰에 페이로드 임베드)

import crypto from 'crypto';

interface TokenPayload {
    /** future_me_reports.id */
    r: string;
    /** issued at (unix sec) */
    i: number;
    /** expires at (unix sec) */
    e: number;
    /** issuer user id */
    u: string;
}

function getSecret(): string {
    const s = process.env.FUTURE_ME_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('FUTURE_ME_SHARE_SECRET 환경변수가 필요합니다.');
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
export function issueShareToken(reportId: string, userId: string, ttlSec: number = 60 * 60 * 24 * 7): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = { r: reportId, i: now, e: now + ttlSec, u: userId };
    const body = base64urlEncode(JSON.stringify(payload));
    const sig = sign(body);
    return `${body}.${sig}`;
}

export interface VerifiedToken {
    reportId: string;
    issuerUserId: string;
    issuedAt: number;
    expiresAt: number;
}

export function verifyShareToken(token: string): VerifiedToken {
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

    return {
        reportId: payload.r,
        issuerUserId: payload.u,
        issuedAt: payload.i,
        expiresAt: payload.e,
    };
}
