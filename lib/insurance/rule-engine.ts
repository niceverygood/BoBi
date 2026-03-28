// lib/insurance/rule-engine.ts
// 규칙 기반 보험 가입 가능 여부 사전 판단 엔진
// STEP 1 분석 결과에서 프로그래밍적으로 판단 → AI는 설명/추천만 담당

import type { AnalysisResult, AnalysisItem, MedicalDetail } from '@/types/analysis';
import { isMajor6Disease, isInRange, getDiseaseName, lookupKcd } from '@/lib/kcd/lookup';

// ─── 타입 정의 ─────────────────────────────────────────────────

/** 개별 고지의무 질문에 대한 판단 결과 */
export interface QuestionVerdict {
    question: string;
    answer: '예' | '아니오';
    applicable: boolean;
    evidence: string[];   // 판단 근거 (날짜, 진단명, 병원 등)
}

/** 보험사별 가입 가능 판단 결과 */
export interface ProductVerdict {
    productType: 'simple' | 'mild' | 'standard';
    productName: string;
    insurer: string;
    nYears: number | null;                   // 간편보험의 N값 (3.N.5)
    questions: QuestionVerdict[];            // 각 질문별 판단
    ruleBasedEligible: 'O' | 'X' | '△';     // 규칙 기반 판정
    ruleBasedReason: string;                 // 판정 이유
    hasExceptionDiseaseMatch: boolean;       // 예외질환 매칭 여부
    exceptionNote: string;                   // 예외질환 관련 안내
}

/** 전체 사전 판단 결과 */
export interface RuleEngineResult {
    analysisDate: string;
    verdicts: ProductVerdict[];
    overallNote: string;
}

// ─── 6대 질병 판별: KCD DB 기반 (lib/kcd/lookup.ts의 isMajor6Disease 사용) ──

// ─── 보험상품 정의 ──────────────────────────────────────────────

interface ProductDefinition {
    productType: 'simple' | 'mild' | 'standard';
    productName: string;
    insurer: string;
    nYears: number | null;      // 간편보험의 N값
    nYearsForHospSurg: number;  // "최근 N년 이내 입원/수술" 기준 년수
}

const PRODUCT_DEFINITIONS: ProductDefinition[] = [
    {
        productType: 'simple',
        productName: '흥국화재 3.10.5 간편보험',
        insurer: '흥국화재',
        nYears: 10,
        nYearsForHospSurg: 10,
    },
    {
        productType: 'simple',
        productName: 'KB손해보험 3.10.10 간편보험',
        insurer: 'KB손해보험',
        nYears: 10,
        nYearsForHospSurg: 10,
    },
    {
        productType: 'simple',
        productName: '롯데손해보험 3.10.10 간편보험',
        insurer: '롯데손해보험',
        nYears: 10,
        nYearsForHospSurg: 10,
    },
    {
        productType: 'simple',
        productName: '한화손해보험 3.10.5 간편보험',
        insurer: '한화손해보험',
        nYears: 10,
        nYearsForHospSurg: 10,
    },
    {
        productType: 'mild',
        productName: '한화생명 초경증 간편보험',
        insurer: '한화생명',
        nYears: 10,
        nYearsForHospSurg: 10,
    },
    {
        productType: 'standard',
        productName: '일반 표준체 건강체 보험',
        insurer: '일반',
        nYears: null,
        nYearsForHospSurg: 5,
    },
];

// ─── 유틸리티 함수 ──────────────────────────────────────────────

/** 날짜 문자열 → Date 객체 (YYYY-MM-DD 형식) */
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    // YYYY-MM-DD 또는 YYYY.MM.DD 또는 YYYYMMDD 등 다양한 형식 처리
    const cleaned = dateStr.replace(/[.\/]/g, '-').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
}

/** 기준일에서 N개월/N년 전 날짜 계산 */
function subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
}

/**
 * KCD 코드가 특정 코드 목록에 해당하는지 확인 (exact match 기반)
 *
 * 매칭 규칙:
 * 1. 코드가 정확히 일치하면 매칭 (예: "305" == "305")
 * 2. prefix 매칭 시 KCD 코드 계층 경계를 존중 (알파벳+숫자 구조)
 *    - "A31"은 "A31", "A31.0", "A31.1" 등과 매칭
 *    - "A31"은 "A311"과 매칭되지 않음 (별도 코드)
 *    - "A3"은 "A30", "A31" 등과 매칭 (상위 카테고리)
 * 3. 숫자 코드 (상품코드)는 정확히 일치해야 매칭 ("305" != "3050", "31" != "311")
 */
function matchesCodePrefix(code: string, prefixes: string[]): boolean {
    if (!code) return false;
    const normalizedCode = code.toUpperCase().trim();

    return prefixes.some(prefix => {
        const normalizedPrefix = prefix.toUpperCase().trim();

        // 정확히 일치
        if (normalizedCode === normalizedPrefix) return true;

        // KCD 코드 계층 구조 매칭:
        // prefix 뒤에 반드시 '.' 또는 끝이어야 함 (하위 분류)
        // 예: prefix "A31" → "A31.0" ✅, "A311" ❌
        if (normalizedCode.startsWith(normalizedPrefix)) {
            const nextChar = normalizedCode[normalizedPrefix.length];
            // 다음 문자가 '.', undefined(끝), 또는 공백이면 계층적 하위 코드
            return nextChar === '.' || nextChar === undefined;
        }

        return false;
    });
}

/** MedicalDetail에서 입원 여부 판단 */
function isHospitalization(detail: MedicalDetail): boolean {
    if (detail.type === '입원') return true;
    if (detail.duration) {
        const dur = detail.duration.toLowerCase();
        if (dur.includes('입원') && !dur.includes('0일')) return true;
    }
    return false;
}

/** MedicalDetail에서 수술 여부 판단 */
function isSurgery(detail: MedicalDetail): boolean {
    if (detail.type === '수술') return true;
    const keywords = ['수술', '절제', '절개', '봉합', '제왕절개', '마취', '시술'];
    const combined = `${detail.diagnosisName || ''} ${detail.note || ''} ${detail.duration || ''}`.toLowerCase();
    return keywords.some(kw => combined.includes(kw));
}

/** 특정 기간 내의 입원/수술 이력 추출 (KCD DB로 정확한 질병명 표시) */
function findHospSurgInPeriod(
    items: AnalysisItem[],
    startDate: Date,
    endDate: Date
): { found: boolean; evidence: string[] } {
    const evidence: string[] = [];

    for (const item of items) {
        for (const detail of item.details) {
            const detailDate = parseDate(detail.date);
            if (!detailDate) continue;
            if (detailDate < startDate || detailDate > endDate) continue;

            if (isHospitalization(detail) || isSurgery(detail)) {
                const type = isSurgery(detail) ? '수술' : '입원';
                // KCD DB에서 정확한 질병명 조회
                const diseaseName = detail.diagnosisCode
                    ? getDiseaseName(detail.diagnosisCode, detail.diagnosisName)
                    : (detail.diagnosisName || '');
                evidence.push(
                    `${detail.date} ${detail.hospital || ''} - ${diseaseName} [${detail.diagnosisCode || ''}] (${type})`
                );
            }
        }
    }

    return { found: evidence.length > 0, evidence };
}

/** 특정 기간 내의 6대질병 이력 확인 (KCD DB 기반 정확 판별) */
function findMajor6InPeriod(
    items: AnalysisItem[],
    diseaseSummary: AnalysisResult['diseaseSummary'],
    startDate: Date,
    endDate: Date
): { found: boolean; evidence: string[]; matchedDiseases: string[] } {
    const evidence: string[] = [];
    const matchedDiseases: string[] = [];

    // items의 details에서 확인 — KCD DB의 isMajor6Disease 사용
    for (const item of items) {
        for (const detail of item.details) {
            const detailDate = parseDate(detail.date);
            if (!detailDate) continue;
            if (detailDate < startDate || detailDate > endDate) continue;

            const major6Check = isMajor6Disease(detail.diagnosisCode);
            if (major6Check.isMajor) {
                if (!matchedDiseases.includes(major6Check.diseaseName)) {
                    matchedDiseases.push(major6Check.diseaseName);
                }
                const exactName = getDiseaseName(detail.diagnosisCode, detail.diagnosisName);
                evidence.push(
                    `${detail.date} ${major6Check.diseaseName} - ${exactName} [${detail.diagnosisCode}] (${detail.hospital || ''})`
                );
            }
        }
    }

    // diseaseSummary에서도 확인
    if (diseaseSummary) {
        for (const ds of diseaseSummary) {
            const firstDate = parseDate(ds.firstDate);
            const lastDate = parseDate(ds.lastDate);
            if (!firstDate && !lastDate) continue;

            const diseaseStart = firstDate || lastDate;
            const diseaseEnd = lastDate || firstDate;
            if (!diseaseStart || !diseaseEnd) continue;

            if (diseaseEnd < startDate || diseaseStart > endDate) continue;

            const major6Check = isMajor6Disease(ds.diseaseCode);
            if (major6Check.isMajor) {
                if (!matchedDiseases.includes(major6Check.diseaseName)) {
                    matchedDiseases.push(major6Check.diseaseName);
                    const exactName = getDiseaseName(ds.diseaseCode, ds.diseaseName);
                    evidence.push(
                        `${exactName} [${ds.diseaseCode}] - ${ds.firstDate}~${ds.lastDate} (${ds.status})`
                    );
                }
            }
        }
    }

    return { found: evidence.length > 0, evidence, matchedDiseases };
}

/** 최근 3개월 이내 입원/수술/추가검사 관련 여부 (간편보험용) */
function check3MonthsSimplified(
    items: AnalysisItem[],
    analysisDate: Date
): QuestionVerdict {
    const startDate = subtractMonths(analysisDate, 3);
    const evidence: string[] = [];

    for (const item of items) {
        for (const detail of item.details) {
            const detailDate = parseDate(detail.date);
            if (!detailDate) continue;
            if (detailDate < startDate || detailDate > analysisDate) continue;

            if (isHospitalization(detail) || isSurgery(detail)) {
                const type = isSurgery(detail) ? '수술' : '입원';
                evidence.push(
                    `${detail.date} ${detail.hospital || ''} - ${detail.diagnosisName || ''} (${type})`
                );
            }
        }
    }

    // STEP 1의 category별 결과도 참조
    const step1_3m = items.find(i => i.category === '3months_visit' || i.category === '3months_medication');
    // 간편보험에서는 3개월 이내 "입원/수술" 여부만 확인 (통원/투약은 해당 안됨)

    return {
        question: '최근 3개월 이내 입원, 수술, 추가검사(재검사) 필요 소견 또는 질병 확정진단을 받은 사실이 있습니까?',
        answer: evidence.length > 0 ? '예' : '아니오',
        applicable: evidence.length > 0,
        evidence,
    };
}

/** 최근 3개월 이내 진료행위 여부 (표준체 보험용 - 더 엄격) */
function check3MonthsStandard(
    items: AnalysisItem[],
    analysisDate: Date
): QuestionVerdict {
    const startDate = subtractMonths(analysisDate, 3);
    const evidence: string[] = [];

    // 표준체는 진찰/검사를 통한 의료행위 전체가 해당
    for (const item of items) {
        if (item.category === '3months_visit' && item.applicable) {
            evidence.push(`3개월 이내 통원 이력: ${item.summary}`);
        }
        if (item.category === '3months_medication' && item.applicable) {
            evidence.push(`3개월 이내 투약 이력: ${item.summary}`);
        }
    }

    // 또한 details 직접 확인
    for (const item of items) {
        for (const detail of item.details) {
            const detailDate = parseDate(detail.date);
            if (!detailDate) continue;
            if (detailDate < startDate || detailDate > analysisDate) continue;
            // 표준체는 모든 의료행위가 해당
            if (!evidence.some(e => e.includes(detail.date))) {
                evidence.push(
                    `${detail.date} ${detail.hospital || ''} - ${detail.diagnosisName || ''} (${detail.type})`
                );
            }
        }
    }

    return {
        question: '최근 3개월 이내 진찰, 검사를 통해 진료를 받은 사실이 있습니까? (혈압강하제/수면제/진통제 등 상시 복용 포함)',
        answer: evidence.length > 0 ? '예' : '아니오',
        applicable: evidence.length > 0,
        evidence: evidence.slice(0, 10), // 너무 많으면 상위 10개만
    };
}

/** 5년 이내 10대질병/중증 질병 (표준체용) */
function check5YearStandard(
    items: AnalysisItem[],
    diseaseSummary: AnalysisResult['diseaseSummary'],
    analysisDate: Date
): QuestionVerdict {
    const startDate = subtractMonths(analysisDate, 60); // 5년
    const evidence: string[] = [];

    // 5년 이내 입원/수술/7일이상치료/30일이상투약
    const hospSurg = findHospSurgInPeriod(items, startDate, analysisDate);
    evidence.push(...hospSurg.evidence);

    // 5year_hospitalization 카테고리 참조
    const step1_5yHosp = items.find(i => i.category === '5year_hospitalization');
    if (step1_5yHosp?.applicable) {
        evidence.push(`5년 이내 입원/수술: ${step1_5yHosp.summary}`);
    }

    // 5year_major_disease 카테고리 참조
    const step1_5y = items.find(i => i.category === '5year_major_disease');
    if (step1_5y?.applicable) {
        evidence.push(`5년 이내 중증질병: ${step1_5y.summary}`);
    }

    // ongoing_medication 참조 (상시 복용)
    const ongoing = items.find(i => i.category === 'ongoing_medication');
    if (ongoing?.applicable) {
        evidence.push(`상시 복용 약물: ${ongoing.summary}`);
    }

    return {
        question: '최근 5년 이내 입원, 수술, 7일 이상 치료, 30일 이상 투약을 받은 사실이 있습니까? 10대 질병 포함.',
        answer: evidence.length > 0 ? '예' : '아니오',
        applicable: evidence.length > 0,
        evidence: evidence.slice(0, 10),
    };
}

// ─── 메인 판단 함수 ─────────────────────────────────────────────

export function evaluateEligibility(analysisResult: AnalysisResult): RuleEngineResult {
    const analysisDate = parseDate(analysisResult.analysisDate);
    if (!analysisDate) {
        return {
            analysisDate: analysisResult.analysisDate,
            verdicts: [],
            overallNote: '분석 기준일을 파싱할 수 없어 규칙 기반 판단을 수행할 수 없습니다.',
        };
    }

    const verdicts: ProductVerdict[] = [];

    for (const product of PRODUCT_DEFINITIONS) {
        const questions: QuestionVerdict[] = [];

        if (product.productType === 'simple' || product.productType === 'mild') {
            // ── 간편보험 / 초경증보험 ──

            // Q1: 최근 3개월 이내 입원/수술/추가검사
            const q1 = check3MonthsSimplified(analysisResult.items, analysisDate);
            questions.push(q1);

            // Q2: 최근 N년 이내 입원 또는 수술
            const nYears = product.nYearsForHospSurg;
            const hospSurgStart = subtractMonths(analysisDate, nYears * 12);
            const hospSurg = findHospSurgInPeriod(analysisResult.items, hospSurgStart, analysisDate);

            // 고혈압/당뇨 관련 통원은 입원/수술이 아니므로 제외 확인
            const filteredEvidence = hospSurg.evidence.filter(e => {
                // 고혈압/당뇨 관련 "통원" 기록은 간편보험에서 문제 안됨
                // 실제 입원/수술만 해당
                return true; // 이미 findHospSurgInPeriod에서 입원/수술만 걸러짐
            });

            questions.push({
                question: `최근 ${nYears}년 이내 입원 또는 수술을 받은 사실이 있습니까?`,
                answer: filteredEvidence.length > 0 ? '예' : '아니오',
                applicable: filteredEvidence.length > 0,
                evidence: filteredEvidence,
            });

            // Q3: 최근 5년 이내 6대질병
            const fiveYearStart = subtractMonths(analysisDate, 60);
            const major6 = findMajor6InPeriod(
                analysisResult.items,
                analysisResult.diseaseSummary,
                fiveYearStart,
                analysisDate
            );

            questions.push({
                question: '최근 5년 이내 암, 뇌졸중, 심근경색, 협심증, 심장판막증, 간경화 진단/입원/수술을 받은 사실이 있습니까?',
                answer: major6.found ? '예' : '아니오',
                applicable: major6.found,
                evidence: major6.evidence,
            });

            // ── 판정 로직 ──
            const applicableQuestions = questions.filter(q => q.applicable);

            let eligible: 'O' | 'X' | '△';
            let reason: string;

            if (applicableQuestions.length === 0) {
                eligible = 'O';
                reason = '모든 고지의무 질문에 "아니오"로 답변 가능하여 가입 가능합니다.';
            } else if (questions[2].applicable) {
                // 6대 질병 해당 → 거의 확실히 가입 불가
                eligible = 'X';
                reason = `최근 5년 이내 6대질병(${major6.matchedDiseases.join(', ')}) 이력이 있어 가입이 어렵습니다.`;
            } else if (questions[0].applicable) {
                // 3개월 이내 입원/수술 → 대기 후 가입 가능 여지
                eligible = '△';
                reason = '최근 3개월 이내 입원/수술 이력이 있어 조건부 심사가 필요합니다. 3개월 경과 후 재검토를 권장합니다.';
            } else if (questions[1].applicable) {
                // N년 이내 입원/수술 → 예외질환 확인 필요
                eligible = '△';
                reason = `최근 ${nYears}년 이내 입원/수술 이력이 있으나, 예외질환에 해당할 경우 가입 가능합니다. 예외질환 DB 확인이 필요합니다.`;
            } else {
                eligible = 'O';
                reason = '가입 가능합니다.';
            }

            // 초경증보험은 고혈압/당뇨가 주요 대상
            if (product.productType === 'mild') {
                const hasHypertensionDiabetes = checkHypertensionDiabetes(analysisResult);
                if (hasHypertensionDiabetes.found && eligible !== 'X') {
                    reason += ` 고혈압/당뇨 이력이 있으나 초경증보험은 이를 위한 상품이므로 가입에 영향 없습니다.`;
                }
            }

            verdicts.push({
                productType: product.productType,
                productName: product.productName,
                insurer: product.insurer,
                nYears: product.nYears,
                questions,
                ruleBasedEligible: eligible,
                ruleBasedReason: reason,
                hasExceptionDiseaseMatch: false, // 예외질환은 별도 모듈에서 처리
                exceptionNote: eligible === '△' || eligible === 'X'
                    ? `${product.insurer} 예외질환 DB와 대조하여 가입 가능 여부를 추가 확인해야 합니다.`
                    : '',
            });

        } else {
            // ── 표준체 건강체 보험 ──

            // Q1: 최근 3개월 이내 진찰/검사 (더 엄격)
            const q1 = check3MonthsStandard(analysisResult.items, analysisDate);
            questions.push(q1);

            // Q2: 최근 5년 이내 입원/수술/7일이상치료/30일이상투약 + 10대질병
            const q2 = check5YearStandard(analysisResult.items, analysisResult.diseaseSummary, analysisDate);
            questions.push(q2);

            // Q3: 상시 복용 약물
            const ongoing = analysisResult.items.find(i => i.category === 'ongoing_medication');
            questions.push({
                question: '현재 상시 복용 중인 약물(혈압강하제, 수면제, 진통제 등)이 있습니까?',
                answer: ongoing?.applicable ? '예' : '아니오',
                applicable: !!ongoing?.applicable,
                evidence: ongoing?.applicable ? [ongoing.summary] : [],
            });

            const applicableCount = questions.filter(q => q.applicable).length;

            let eligible: 'O' | 'X' | '△';
            let reason: string;

            if (applicableCount === 0) {
                eligible = 'O';
                reason = '모든 고지의무 질문에 "아니오"로 답변 가능하여 일반 건강체 보험 가입이 가능합니다.';
            } else if (applicableCount >= 2) {
                eligible = 'X';
                reason = `${applicableCount}개 고지의무 항목에 해당하여 일반 표준체 보험 가입이 어렵습니다. 간편보험 또는 초경증보험을 권장합니다.`;
            } else {
                eligible = '△';
                reason = '1개 항목에 해당하여 보험사 심사가 필요합니다. 조건부 가입 가능성이 있습니다.';
            }

            verdicts.push({
                productType: product.productType,
                productName: product.productName,
                insurer: product.insurer,
                nYears: product.nYears,
                questions,
                ruleBasedEligible: eligible,
                ruleBasedReason: reason,
                hasExceptionDiseaseMatch: false,
                exceptionNote: '',
            });
        }
    }

    // ── 간편보험 세부 N년 분석 (3.0.5 ~ 3.10.5) ──
    const simpleInsuranceDetail = analyzeSimpleInsuranceNYears(analysisResult, analysisDate);

    const overallNote = generateOverallNote(verdicts, simpleInsuranceDetail);

    return {
        analysisDate: analysisResult.analysisDate,
        verdicts,
        overallNote,
    };
}

// ─── 고혈압/당뇨 확인 ───────────────────────────────────────────

function checkHypertensionDiabetes(result: AnalysisResult): {
    found: boolean;
    diseases: string[];
} {
    const diseases: string[] = [];

    const allDetails = result.items.flatMap(i => i.details);
    for (const detail of allDetails) {
        // KCD DB 기반 범위 체크
        if (isInRange(detail.diagnosisCode, 'I10-I15')) {
            if (!diseases.includes('고혈압')) diseases.push('고혈압');
        }
        if (isInRange(detail.diagnosisCode, 'E10-E14')) {
            if (!diseases.includes('당뇨')) diseases.push('당뇨');
        }
    }

    if (result.diseaseSummary) {
        for (const ds of result.diseaseSummary) {
            if (isInRange(ds.diseaseCode, 'I10-I15')) {
                if (!diseases.includes('고혈압')) diseases.push('고혈압');
            }
            if (isInRange(ds.diseaseCode, 'E10-E14')) {
                if (!diseases.includes('당뇨')) diseases.push('당뇨');
            }
        }
    }

    return { found: diseases.length > 0, diseases };
}

// ─── 간편보험 N년별 세부 분석 ───────────────────────────────────

interface SimpleNYearResult {
    nType: string;       // 예: "3.1.5"
    nYears: number;
    hospSurgFound: boolean;
    evidence: string[];
}

function analyzeSimpleInsuranceNYears(
    result: AnalysisResult,
    analysisDate: Date
): SimpleNYearResult[] {
    const nValues = [0, 1, 2, 3, 4, 5, 10];
    const results: SimpleNYearResult[] = [];

    for (const n of nValues) {
        if (n === 0) {
            // 3.0.5형: 입원/수술 기간 제한 없음 (3개월 + 6대질병 5년만 확인)
            results.push({
                nType: '3.0.5',
                nYears: 0,
                hospSurgFound: false,
                evidence: ['3.0.5형은 입원/수술 기간 질문이 없습니다 (3개월 + 6대질병 5년만 확인)'],
            });
        } else {
            const startDate = subtractMonths(analysisDate, n * 12);
            const { found, evidence } = findHospSurgInPeriod(result.items, startDate, analysisDate);
            results.push({
                nType: `3.${n}.5`,
                nYears: n,
                hospSurgFound: found,
                evidence,
            });
        }
    }

    return results;
}

// ─── 종합 안내 생성 ─────────────────────────────────────────────

function generateOverallNote(
    verdicts: ProductVerdict[],
    simpleNYears: SimpleNYearResult[]
): string {
    const lines: string[] = [];

    // 가입 가능한 상품이 있는지
    const available = verdicts.filter(v => v.ruleBasedEligible === 'O');
    const conditional = verdicts.filter(v => v.ruleBasedEligible === '△');
    const unavailable = verdicts.filter(v => v.ruleBasedEligible === 'X');

    if (available.length > 0) {
        lines.push(`✅ 가입 가능 상품: ${available.map(v => v.productName).join(', ')}`);
    }
    if (conditional.length > 0) {
        lines.push(`△ 조건부 심사 필요: ${conditional.map(v => v.productName).join(', ')}`);
    }
    if (unavailable.length > 0) {
        lines.push(`❌ 가입 어려움: ${unavailable.map(v => v.productName).join(', ')}`);
    }

    // 간편보험 N년 분석 요약
    const bestN = simpleNYears.find(r => !r.hospSurgFound && r.nYears > 0);
    if (bestN) {
        lines.push(`💡 간편보험 최적: ${bestN.nType}형 (최근 ${bestN.nYears}년 이내 입원/수술 없음)`);
    }

    // 가입 불가 시 대안 안내
    if (available.length === 0 && conditional.length === 0) {
        lines.push('⚠️ 모든 상품 가입이 어려운 상황입니다. 예외질환 DB를 반드시 확인하세요.');
    }

    return lines.join('\n');
}

// ─── AI 프롬프트용 텍스트 변환 ──────────────────────────────────

export function formatRuleEngineResultForPrompt(result: RuleEngineResult): string {
    let text = `\n## 📋 규칙 기반 사전 판단 결과 (코드 자동 판정)\n\n`;
    text += `분석 기준일: ${result.analysisDate}\n`;
    text += `⚠️ 아래 판정 결과는 프로그래밍 규칙에 의한 자동 판정입니다. 이 결과를 기반으로 최종 판단해주세요.\n\n`;

    for (const verdict of result.verdicts) {
        const emoji = verdict.ruleBasedEligible === 'O' ? '✅' :
            verdict.ruleBasedEligible === 'X' ? '❌' : '⚠️';
        text += `### ${emoji} ${verdict.productName}\n`;
        text += `- **규칙 판정**: ${verdict.ruleBasedEligible} (${verdict.ruleBasedReason})\n`;

        for (const q of verdict.questions) {
            const qEmoji = q.applicable ? '🔴' : '🟢';
            text += `  ${qEmoji} ${q.question}\n`;
            text += `    → 답변: **${q.answer}**\n`;
            if (q.evidence.length > 0) {
                text += `    → 근거:\n`;
                for (const e of q.evidence.slice(0, 5)) {
                    text += `      - ${e}\n`;
                }
                if (q.evidence.length > 5) {
                    text += `      ... 외 ${q.evidence.length - 5}건\n`;
                }
            }
        }

        if (verdict.exceptionNote) {
            text += `  💡 ${verdict.exceptionNote}\n`;
        }
        text += `\n`;
    }

    text += `### 종합\n${result.overallNote}\n`;

    return text;
}
