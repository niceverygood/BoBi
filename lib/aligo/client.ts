// lib/aligo/client.ts
// ALIGO 알림톡 V10 API 클라이언트

const ALIGO_BASE = 'https://kakaoapi.aligo.in';

export interface AligoButton {
    name: string;
    /** WL=웹링크, AL=앱링크, BK=봇키워드, MD=메시지전달, BC=상담톡전환 */
    linkType: 'WL' | 'AL' | 'BK' | 'MD' | 'BC';
    linkM?: string;  // 모바일
    linkP?: string;  // PC
}

export interface SendAlimtalkOptions {
    /** 카카오 검수 통과 템플릿 코드 (예: UH_0933) */
    templateCode: string;
    receiverPhone: string;
    receiverName?: string;
    /** 알림톡 본문 (템플릿 변수 치환 완료된 최종 텍스트, 템플릿과 100% 일치) */
    message: string;
    /** SMS 대체발송용 제목 (50자 이내) */
    subject: string;
    buttons?: AligoButton[];
    failoverToSms?: boolean;
}

export interface AligoSendResult {
    code: number;        // 0 = 성공, 음수 = 실패
    message: string;
    info?: { type?: string; mid?: number; scnt?: number; fcnt?: number };
}

function getCreds() {
    const apikey = process.env.ALIGO_API_KEY;
    const userid = process.env.ALIGO_USER_ID;
    const senderkey = process.env.ALIGO_SENDER_KEY;
    const sender = process.env.ALIGO_SENDER_NUMBER;

    if (!apikey || !userid || !senderkey || !sender) {
        throw new Error(
            'ALIGO 환경변수 누락: ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDER_KEY / ALIGO_SENDER_NUMBER',
        );
    }
    return { apikey, userid, senderkey, sender };
}

export function normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
}

export function isValidKoreanPhone(phone: string): boolean {
    const digits = normalizePhone(phone);
    return /^01[016789]\d{7,8}$/.test(digits);
}

export async function sendAlimtalk(opts: SendAlimtalkOptions): Promise<AligoSendResult> {
    const creds = getCreds();
    const phone = normalizePhone(opts.receiverPhone);

    if (!isValidKoreanPhone(phone)) {
        throw new Error(`유효하지 않은 휴대폰 번호: ${opts.receiverPhone}`);
    }

    const form = new URLSearchParams();
    form.set('apikey', creds.apikey);
    form.set('userid', creds.userid);
    form.set('senderkey', creds.senderkey);
    form.set('tpl_code', opts.templateCode);
    form.set('sender', creds.sender);
    form.set('receiver_1', phone);
    if (opts.receiverName) form.set('recvname_1', opts.receiverName);
    form.set('subject_1', opts.subject.slice(0, 50));
    form.set('message_1', opts.message);

    if (opts.buttons && opts.buttons.length > 0) {
        const button = {
            button: opts.buttons.map(b => ({
                name: b.name,
                linkType: b.linkType,
                linkM: b.linkM || '',
                linkP: b.linkP || '',
            })),
        };
        form.set('button_1', JSON.stringify(button));
    }

    form.set('failover', opts.failoverToSms === false ? 'N' : 'Y');
    if (opts.failoverToSms !== false) {
        form.set('fsubject_1', opts.subject.slice(0, 30));
        form.set('fmessage_1', opts.message.slice(0, 80));
    }

    const response = await fetch(`${ALIGO_BASE}/akv10/alimtalk/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
    });

    if (!response.ok) {
        throw new Error(`ALIGO HTTP ${response.status}`);
    }

    const data = (await response.json()) as AligoSendResult;
    if (data.code !== 0) {
        throw new Error(`ALIGO 발송 실패 (code ${data.code}): ${data.message}`);
    }
    return data;
}
