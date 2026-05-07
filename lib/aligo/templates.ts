// lib/aligo/templates.ts
//
// ALIGO 알림톡 템플릿 코드를 환경변수에서 읽어 단일 출처로 제공.
// 검수 통과 후 환경변수만 채우면 자동 활성화된다 (코드 재배포 불필요할 수 있음 —
// Vercel ENV는 새 deploy 시점에 적용되므로 통과 후 재배포 1회 필요).
//
// 검수 미통과 상태에서 발송 시도 시 ALIGO가 거절. 우리는 그 거절을 잡아
// "검수 진행 중입니다" 메시지로 사용자에게 안내한다 (send-kakao route).

export type TemplateKind =
    | 'future_me_link'
    | 'future_me_summary'
    | 'medical_link'
    | 'medical_summary'
    | 'risk_link'
    | 'risk_summary'
    | 'receipt_link'
    | 'receipt_summary';

const ENV_KEYS: Record<TemplateKind, string> = {
    future_me_link: 'ALIGO_TPL_FUTURE_ME_LINK',
    future_me_summary: 'ALIGO_TPL_FUTURE_ME_SUMMARY',
    medical_link: 'ALIGO_TPL_MEDICAL_LINK',
    medical_summary: 'ALIGO_TPL_MEDICAL_SUMMARY',
    risk_link: 'ALIGO_TPL_RISK_LINK',
    risk_summary: 'ALIGO_TPL_RISK_SUMMARY',
    receipt_link: 'ALIGO_TPL_RECEIPT_LINK',
    receipt_summary: 'ALIGO_TPL_RECEIPT_SUMMARY',
};

// 등록 시점에 받은 ALIGO 템플릿 코드. 환경변수 미설정 시 fallback으로 사용.
// (검수 미통과 상태에서도 코드 자체는 받아둔 상태라 그대로 발송 시도하면
//  ALIGO가 명확한 거절 메시지를 반환 → 사용자에게 "검수 진행 중" 안내 가능)
const REGISTERED_FALLBACK: Record<TemplateKind, string> = {
    future_me_link: 'UH_0933',
    future_me_summary: 'UH_0934',
    medical_link: 'UH_6830',
    medical_summary: 'UH_6831',
    risk_link: 'UH_6832',
    risk_summary: 'UH_6833',
    receipt_link: 'UH_6835',
    receipt_summary: 'UH_6836',
};

/**
 * 검수 통과 표식. 환경변수에 코드가 박혀 있으면 통과로 간주한다.
 * 미설정 시 fallback 코드는 있지만 ALIGO에서 거절될 수 있어 false 반환 →
 * UI에서 "검수 진행 중" 안내 표시.
 */
export function isTemplateApproved(kind: TemplateKind): boolean {
    return Boolean(process.env[ENV_KEYS[kind]]);
}

/** 발송에 실제 사용할 템플릿 코드 (환경변수 → fallback) */
export function getTemplateCode(kind: TemplateKind): string {
    return process.env[ENV_KEYS[kind]] || REGISTERED_FALLBACK[kind];
}
