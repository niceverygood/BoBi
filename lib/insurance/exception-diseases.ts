// lib/insurance/exception-diseases.ts
// 보험사별 예외질환 매칭 모듈

import exceptionData from '@/data/exception-diseases.json';

/**
 * 고객의 진단코드 목록과 보험사별 예외질환 DB를 대조하여
 * 해당되는 예외질환 정보만 추출
 */

interface ExceptionMatch {
    insurer: string;
    productType: string;
    kcd?: string;
    diseaseName: string;
    period: string;
    maxDays: string;
    surgeryType?: string;
    surgeryCondition?: string;
    category?: string;
    note?: string;
}

interface InsurerExceptionSummary {
    insurer: string;
    productType: string;
    note: string;
    matchedExceptions: ExceptionMatch[];
    totalAvailableExceptions: number;
}

/**
 * KCD 코드 매칭 (prefix 매칭 지원)
 * 예: 고객코드 "I10.0" → 예외질환 "I10" 매칭
 * 예: 고객코드 "K64" → 예외질환 "K64.0" 매칭
 */
function isKcdMatch(customerCode: string, exceptionCode: string): boolean {
    const c = customerCode.toUpperCase().trim();
    const e = exceptionCode.toUpperCase().trim();

    // 정확 매칭
    if (c === e) return true;

    // 고객 코드가 예외질환 코드의 상위코드인 경우 (예: I10 → I10.0)
    if (e.startsWith(c + '.') || e.startsWith(c)) return true;

    // 예외질환 코드가 고객 코드의 상위코드인 경우 (예: I10 ← I10.0)
    if (c.startsWith(e + '.') || c.startsWith(e)) return true;

    return false;
}

/**
 * 진단명 기반 매칭 (부분 문자열 매칭)
 */
function isNameMatch(customerDiagnosisName: string, exceptionDiseaseName: string): boolean {
    const c = customerDiagnosisName.trim().toLowerCase();
    const e = exceptionDiseaseName.trim().toLowerCase();

    if (!c || !e) return false;

    // 부분 문자열 매칭
    return c.includes(e) || e.includes(c);
}

/**
 * 고객의 진단 코드/이름 목록과 보험사별 예외질환 DB를 대조
 */
export function findExceptionMatches(
    customerDiagnoses: Array<{ code: string; name: string }>
): InsurerExceptionSummary[] {
    const data = exceptionData as Record<string, {
        productType: string;
        note: string;
        totalExceptions: number;
        exceptions: Array<Record<string, string>>;
    }>;

    const results: InsurerExceptionSummary[] = [];

    for (const [insurer, info] of Object.entries(data)) {
        const matchedExceptions: ExceptionMatch[] = [];

        for (const exception of info.exceptions) {
            for (const diagnosis of customerDiagnoses) {
                let matched = false;

                // KCD 코드 매칭 (흥국화재, 롯데 등)
                if (exception.kcd && diagnosis.code) {
                    if (isKcdMatch(diagnosis.code, exception.kcd)) {
                        matched = true;
                    }
                }

                // 진단명 매칭 (KB손보, 한화 등)
                if (!matched && exception.diseaseName && diagnosis.name) {
                    if (isNameMatch(diagnosis.name, exception.diseaseName)) {
                        matched = true;
                    }
                }

                // diseases 필드 매칭 (한화생명 등 카테고리 기반)
                if (!matched && exception.diseases && diagnosis.name) {
                    if (isNameMatch(diagnosis.name, exception.diseases)) {
                        matched = true;
                    }
                }

                if (matched) {
                    matchedExceptions.push({
                        insurer,
                        productType: info.productType,
                        kcd: exception.kcd || undefined,
                        diseaseName: exception.diseaseName || exception.name || exception.diseases || '',
                        period: exception.period || exception.condition_3_10_5 || '',
                        maxDays: exception.maxDays || '',
                        surgeryType: exception.surgeryType || undefined,
                        surgeryCondition: exception.surgeryCondition || undefined,
                        category: exception.category || undefined,
                    });
                    break; // 이 예외질환은 이미 매칭됨, 다음 예외로
                }
            }
        }

        results.push({
            insurer,
            productType: info.productType,
            note: info.note,
            matchedExceptions,
            totalAvailableExceptions: info.totalExceptions,
        });
    }

    return results;
}

/**
 * 예외질환 매칭 결과를 AI 프롬프트용 텍스트로 변환
 */
export function generateExceptionContext(
    customerDiagnoses: Array<{ code: string; name: string }>
): string {
    const matches = findExceptionMatches(customerDiagnoses);

    let context = `\n## 보험사별 예외질환 매칭 결과\n\n`;
    context += `⚠️ 아래는 고객의 진단 이력과 매칭되는 보험사별 예외질환 목록입니다.\n`;
    context += `예외질환에 해당하면, 해당 질환으로 입원/수술 이력이 있더라도 간편보험/초경증보험 가입이 가능합니다.\n`;
    context += `고혈압·당뇨 등 만성질환이 있는 고객은 간편보험/초경증보험이 이 질환들을 위한 보험이므로 가입 가능합니다.\n\n`;

    for (const result of matches) {
        context += `### ${result.insurer} (${result.productType})\n`;
        context += `- 참고: ${result.note}\n`;
        context += `- 전체 예외질환 수: ${result.totalAvailableExceptions}건\n`;

        if (result.matchedExceptions.length > 0) {
            context += `- ✅ **고객 매칭 예외질환: ${result.matchedExceptions.length}건**\n`;
            for (const ex of result.matchedExceptions) {
                context += `  - ${ex.kcd ? `[${ex.kcd}] ` : ''}${ex.diseaseName}`;
                if (ex.period) context += ` | 경과기간: ${ex.period}`;
                if (ex.maxDays) context += ` | 인수가능 입원일수: ${ex.maxDays}`;
                if (ex.surgeryType) context += ` | 시술/수술: ${ex.surgeryType}`;
                if (ex.surgeryCondition) context += ` | 조건: ${ex.surgeryCondition}`;
                context += `\n`;
            }
        } else {
            context += `- ⛔ 매칭되는 예외질환 없음 (단, 전체 ${result.totalAvailableExceptions}건 중 진단명 단위로만 비교했으므로 추가 확인 필요)\n`;
        }
        context += `\n`;
    }

    return context;
}
