// lib/solapi/templates.ts
//
// SOLAPI 알림톡 템플릿 ID 단일 출처.
//
// ALIGO 에서 솔라피로 마이그레이션 (이종인 5/13). ALIGO 의 12종 템플릿은 솔라피에서
// 다시 등록 + 카카오 검수를 거쳐야 새 templateId 가 발급됨 (예: KA01TP...).
// 환경변수 SOLAPI_TPL_* 에 새 ID 를 채워야 발송 가능. 미설정 시 fallback ID 도
// 두지 않음 (잘못된 ID 발송 시 솔라피가 비용 청구하므로) — 호출 측에서
// isTemplateApproved() 로 사전 확인 후 발송 또는 사용자에게 "검수 진행 중" 안내.

export type TemplateKind =
    | 'future_me_link'
    | 'future_me_summary'
    | 'medical_link'
    | 'medical_summary'
    | 'risk_link'
    | 'risk_summary'
    | 'receipt_link'
    | 'receipt_summary'
    | 'crm_renewal'
    | 'crm_exemption_end'
    | 'crm_reduction_end'
    | 'crm_birthday';

const ENV_KEYS: Record<TemplateKind, string> = {
    future_me_link: 'SOLAPI_TPL_FUTURE_ME_LINK',
    future_me_summary: 'SOLAPI_TPL_FUTURE_ME_SUMMARY',
    medical_link: 'SOLAPI_TPL_MEDICAL_LINK',
    medical_summary: 'SOLAPI_TPL_MEDICAL_SUMMARY',
    risk_link: 'SOLAPI_TPL_RISK_LINK',
    risk_summary: 'SOLAPI_TPL_RISK_SUMMARY',
    receipt_link: 'SOLAPI_TPL_RECEIPT_LINK',
    receipt_summary: 'SOLAPI_TPL_RECEIPT_SUMMARY',
    crm_renewal: 'SOLAPI_TPL_CRM_RENEWAL',
    crm_exemption_end: 'SOLAPI_TPL_CRM_EXEMPTION_END',
    crm_reduction_end: 'SOLAPI_TPL_CRM_REDUCTION_END',
    crm_birthday: 'SOLAPI_TPL_CRM_BIRTHDAY',
};

/**
 * 환경변수에 templateId 가 박혀 있고 카카오 검수까지 통과된 상태인지 표식.
 * 미설정 시 false → UI 에서 "검수 진행 중" 안내 표시.
 */
export function isTemplateApproved(kind: TemplateKind): boolean {
    return Boolean(process.env[ENV_KEYS[kind]]);
}

/**
 * 발송에 사용할 솔라피 templateId.
 * 환경변수 미설정 시 throw — 잘못된 ID 로 발송하면 비용 청구 + 디버깅 어려움.
 */
export function getTemplateId(kind: TemplateKind): string {
    const id = process.env[ENV_KEYS[kind]];
    if (!id) {
        throw new Error(
            `SOLAPI 템플릿 ID 미설정: ${ENV_KEYS[kind]}. ` +
            `솔라피 콘솔에서 ${kind} 템플릿 검수 통과 후 환경변수에 ID 입력 필요.`,
        );
    }
    return id;
}
