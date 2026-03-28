// lib/ai/date-validator.ts
// 서버 사이드 날짜 검증: AI 분석 결과에서 날짜 기반 판정을 코드로 재검증
// AI가 "오늘 날짜" 대신 "데이터의 마지막 날짜"를 기준으로 계산하는 오류를 방지

import type { AnalysisResult, AnalysisItem, MedicalDetail } from '@/types/analysis';

/** 날짜 문자열 → Date 객체 (YYYY-MM-DD, YYYY.MM.DD 등 다양한 형식 지원) */
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/[.\/]/g, '-').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
}

/** 두 날짜 사이의 개월 수 계산 */
function monthsBetween(from: Date, to: Date): number {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** 특정 날짜가 기준일로부터 N개월 이내인지 확인 */
function isWithinMonths(targetDate: Date, referenceDate: Date, months: number): boolean {
    const cutoffDate = new Date(referenceDate);
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    // 기간의 시작(cutoff) 이후 ~ 기준일 이전이면 "N개월 이내"
    return targetDate >= cutoffDate && targetDate <= referenceDate;
}

/** 약국인지 확인 (약국 방문은 통원 횟수에서 제외) */
function isPharmacy(hospital: string): boolean {
    if (!hospital) return false;
    return /약국/i.test(hospital);
}

interface ValidationCorrection {
    category: string;
    originalApplicable: boolean;
    correctedApplicable: boolean;
    reason: string;
    removedDetails: string[];
    keptDetails: string[];
}

interface ValidationResult {
    corrected: boolean;
    corrections: ValidationCorrection[];
    result: AnalysisResult;
}

/**
 * AI 분석 결과를 오늘 날짜 기준으로 재검증하여 잘못된 판정을 교정합니다.
 * 
 * @param result - AI가 반환한 AnalysisResult
 * @param todayStr - 오늘 날짜 (YYYY-MM-DD)
 * @returns 교정된 AnalysisResult + 교정 내역
 */
export function validateAndCorrectDates(result: AnalysisResult, todayStr: string): ValidationResult {
    const today = parseDate(todayStr);
    if (!today) {
        return { corrected: false, corrections: [], result };
    }

    const corrections: ValidationCorrection[] = [];
    const correctedItems: AnalysisItem[] = [];

    for (const item of result.items) {
        const { correctedItem, correction } = validateItem(item, today);
        correctedItems.push(correctedItem);
        if (correction) {
            corrections.push(correction);
        }
    }

    const correctedResult: AnalysisResult = {
        ...result,
        analysisDate: todayStr, // 반드시 오늘 날짜로 설정
        items: correctedItems,
    };

    return {
        corrected: corrections.length > 0,
        corrections,
        result: correctedResult,
    };
}

function validateItem(item: AnalysisItem, today: Date): {
    correctedItem: AnalysisItem;
    correction: ValidationCorrection | null;
} {
    const category = item.category;
    let periodMonths: number;

    switch (category) {
        case '3months_visit':
            periodMonths = 3;
            break;
        case '3months_medication':
            periodMonths = 3;
            break;
        case '1year_hospitalization':
            periodMonths = 12;
            break;
        case '2year_hospitalization':
            periodMonths = 24;
            break;
        case '5year_hospitalization':
            periodMonths = 60;
            break;
        case '5year_major_disease':
            periodMonths = 60;
            break;
        case 'ongoing_medication':
            // 상시 복용 약물은 기간 검증이 아니라 패턴 검증이므로 그대로 유지
            return { correctedItem: item, correction: null };
        default:
            return { correctedItem: item, correction: null };
    }

    // 각 detail의 날짜가 실제로 해당 기간 내인지 검증
    const keptDetails: MedicalDetail[] = [];
    const removedDetails: string[] = [];
    const keptDetailDescs: string[] = [];

    for (const detail of item.details) {
        const detailDate = parseDate(detail.date);
        if (!detailDate) {
            // 날짜를 파싱할 수 없으면 그대로 유지 (안전한 방향)
            keptDetails.push(detail);
            keptDetailDescs.push(`${detail.date} (날짜 파싱 불가, 유지)`);
            continue;
        }

        if (isWithinMonths(detailDate, today, periodMonths)) {
            keptDetails.push(detail);
            keptDetailDescs.push(`${detail.date} (${monthsBetween(detailDate, today)}개월 전, 기간 내)`);
        } else {
            const monthsAgo = monthsBetween(detailDate, today);
            removedDetails.push(
                `${detail.date} ${detail.diagnosisName || ''} (${monthsAgo}개월 전 → ${periodMonths}개월 범위 밖)`
            );
        }
    }

    // 3months_visit 특별 처리: 같은 KCD 코드로 7회 이상 통원한 경우만 해당
    if (category === '3months_visit') {
        // 약국 방문 제외
        const nonPharmacyDetails = keptDetails.filter(d => !isPharmacy(d.hospital));

        // KCD 코드별 그룹핑
        const codeGroups: Map<string, MedicalDetail[]> = new Map();
        for (const detail of nonPharmacyDetails) {
            const code = detail.diagnosisCode || 'unknown';
            if (!codeGroups.has(code)) {
                codeGroups.set(code, []);
            }
            codeGroups.get(code)!.push(detail);
        }

        // 7회 이상인 코드만 남기기
        const qualifyingDetails: MedicalDetail[] = [];
        for (const [code, details] of codeGroups) {
            if (details.length >= 7) {
                qualifyingDetails.push(...details);
            }
        }

        const newApplicable = qualifyingDetails.length > 0;
        if (newApplicable !== item.applicable || removedDetails.length > 0) {
            return {
                correctedItem: {
                    ...item,
                    applicable: newApplicable,
                    details: newApplicable ? qualifyingDetails : [],
                    summary: newApplicable
                        ? item.summary
                        : `해당없음 (오늘 기준 최근 3개월 이내 동일 질병코드 7회 이상 통원 기록 없음)`,
                },
                correction: {
                    category,
                    originalApplicable: item.applicable,
                    correctedApplicable: newApplicable,
                    reason: newApplicable
                        ? `기간 내 유효 데이터 확인됨`
                        : `오늘(${formatDate(today)}) 기준 최근 ${periodMonths}개월 이내 해당 기록 없음. ${removedDetails.length}건 기간 외 제거.`,
                    removedDetails,
                    keptDetails: keptDetailDescs,
                },
            };
        }
        return { correctedItem: item, correction: null };
    }

    // 일반 카테고리: 기간 내 유효한 detail이 있으면 applicable = true
    const newApplicable = keptDetails.length > 0;

    if (newApplicable !== item.applicable || removedDetails.length > 0) {
        const periodLabel = periodMonths >= 12
            ? `${periodMonths / 12}년`
            : `${periodMonths}개월`;

        return {
            correctedItem: {
                ...item,
                applicable: newApplicable,
                details: keptDetails,
                summary: newApplicable
                    ? item.summary
                    : `해당없음 (오늘 기준 최근 ${periodLabel} 이내 해당 기록 없음)`,
            },
            correction: {
                category,
                originalApplicable: item.applicable,
                correctedApplicable: newApplicable,
                reason: newApplicable
                    ? `기간 내 유효 데이터 ${keptDetails.length}건 확인됨 (기간 외 ${removedDetails.length}건 제거)`
                    : `오늘(${formatDate(today)}) 기준 최근 ${periodLabel} 이내 해당 기록 없음. AI가 잘못 판정한 ${removedDetails.length}건 제거.`,
                removedDetails,
                keptDetails: keptDetailDescs,
            },
        };
    }

    return { correctedItem: item, correction: null };
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * 교정 내역을 콘솔 로그용 문자열로 변환
 */
export function formatCorrections(corrections: ValidationCorrection[]): string {
    if (corrections.length === 0) return '날짜 검증 통과: 교정 필요 없음';

    const lines: string[] = ['⚠️ 날짜 기반 검증에서 AI 결과를 교정했습니다:'];
    for (const c of corrections) {
        const arrow = c.originalApplicable !== c.correctedApplicable
            ? `${c.originalApplicable ? '해당→해당없음' : '해당없음→해당'}`
            : '상세 수정';
        lines.push(`  [${c.category}] ${arrow}: ${c.reason}`);
        if (c.removedDetails.length > 0) {
            lines.push(`    제거: ${c.removedDetails.join(', ')}`);
        }
    }
    return lines.join('\n');
}
