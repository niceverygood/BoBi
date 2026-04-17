// lib/inicis/hash.ts
// KG이니시스 INIpay Standard / INIAPI 해시 유틸

import crypto from 'crypto';

export function sha256Hex(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export function sha512Hex(data: string): string {
    return crypto.createHash('sha512').update(data, 'utf8').digest('hex');
}

/** YYYYMMDDhhmmss (이니시스 API 표준) */
export function inicisTimestamp(d: Date = new Date()): string {
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );
}

/** 고유 주문번호 (INIpay OID) — 최대 40자 */
export function generateInicisOid(prefix: string = 'bobi'): string {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${ts}_${rnd}`.slice(0, 40);
}

/** 밀리초 타임스탬프 (INIpay Standard 결제창용) */
export function inicisMsTimestamp(): string {
    return String(Date.now());
}
