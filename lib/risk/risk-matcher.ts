// lib/risk/risk-matcher.ts
// 환자 병력 데이터 → 매핑 테이블 매칭 → 위험 질환 목록 추출

import { DISEASE_RISK_MAP, MEDICATION_DISEASE_MAP, type DiseaseRiskEntry } from './disease-risk-map';
import type { AnalysisResult, DiseaseSummary, MedicalDetail } from '@/types/analysis';
import type { RiskLevel } from '@/types/risk-report';

export interface MatchedRisk extends DiseaseRiskEntry {
    riskLevel: RiskLevel;
    matchedFrom: 'diagnosis' | 'medication';
}

export interface PatientProfile {
    diseaseCodes: Set<string>;
    diseaseNames: Map<string, string>; // code → name
    medications: string[];
    diseaseSummaries: DiseaseSummary[];
}

/** Step 1 분석 결과에서 환자 프로필 추출 */
export function extractPatientProfile(analysis: AnalysisResult): PatientProfile {
    const diseaseCodes = new Set<string>();
    const diseaseNames = new Map<string, string>();
    const medications: string[] = [];

    // 모든 items에서 진단코드 및 약물 수집
    for (const item of analysis.items) {
        if (!item.applicable) continue;
        for (const detail of item.details) {
            if (detail.diagnosisCode) {
                const code = detail.diagnosisCode.trim().toUpperCase();
                diseaseCodes.add(code);
                if (detail.diagnosisName) {
                    diseaseNames.set(code, detail.diagnosisName);
                }
            }
            if (detail.medication) medications.push(detail.medication);
            if (detail.ingredient) medications.push(detail.ingredient);
        }
    }

    // diseaseSummary에서도 추출
    const diseaseSummaries = analysis.diseaseSummary || [];
    for (const ds of diseaseSummaries) {
        if (ds.diseaseCode) {
            const code = ds.diseaseCode.trim().toUpperCase();
            diseaseCodes.add(code);
            diseaseNames.set(code, ds.diseaseName);
        }
    }

    return { diseaseCodes, diseaseNames, medications, diseaseSummaries };
}

/** 약물에서 기저질환 코드 추정 (진단코드로 안 잡힌 경우 보완) */
function inferDiseasesFromMedications(profile: PatientProfile): void {
    for (const med of profile.medications) {
        const medLower = med.toLowerCase();
        for (const mapping of MEDICATION_DISEASE_MAP) {
            if (medLower.includes(mapping.keyword.toLowerCase())) {
                if (!profile.diseaseCodes.has(mapping.impliedCode)) {
                    profile.diseaseCodes.add(mapping.impliedCode);
                    profile.diseaseNames.set(mapping.impliedCode, mapping.impliedName);
                }
            }
        }
    }
}

/** KCD 코드 prefix 매칭 (I10 → I10, I10.1, I10.9 등) */
function codeMatches(patientCode: string, mapCode: string): boolean {
    return patientCode.startsWith(mapCode);
}

/** 상대위험도 → 위험 수준 변환 */
function toRiskLevel(rr: number): RiskLevel {
    if (rr >= 3.0) return 'high';
    if (rr >= 1.8) return 'moderate';
    return 'low';
}

/** 메인 매칭 함수: 환자 프로필 → 위험 질환 목록 */
export function matchRisks(analysis: AnalysisResult): MatchedRisk[] {
    const profile = extractPatientProfile(analysis);
    inferDiseasesFromMedications(profile);

    const matched: MatchedRisk[] = [];
    const seen = new Set<string>(); // 중복 방지: "sourceCode:riskDisease"

    for (const entry of DISEASE_RISK_MAP) {
        for (const patientCode of profile.diseaseCodes) {
            if (!codeMatches(patientCode, entry.sourceCode)) continue;

            const key = `${entry.sourceCode}:${entry.riskDisease}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // 이미 해당 위험 질환을 가지고 있으면 제외 (예측이 아니라 현재 질환)
            const riskAlreadyPresent = [...profile.diseaseCodes].some(c =>
                DISEASE_RISK_MAP.some(e =>
                    e.sourceName === entry.riskDisease && codeMatches(c, e.sourceCode)
                )
            );

            matched.push({
                ...entry,
                // 원인 질환명을 환자 데이터의 실제 이름으로 교체 (더 구체적)
                sourceName: profile.diseaseNames.get(patientCode) || entry.sourceName,
                riskLevel: toRiskLevel(entry.relativeRisk),
                matchedFrom: 'diagnosis',
            });
        }
    }

    // 위험도 높은 순 정렬
    matched.sort((a, b) => b.relativeRisk - a.relativeRisk);

    return matched;
}

/** 환자에게 해당하는 약물 목록 추출 (리포트 표시용) */
export function extractMedications(analysis: AnalysisResult): string[] {
    const meds = new Set<string>();
    for (const item of analysis.items) {
        if (!item.applicable) continue;
        for (const detail of item.details) {
            if (detail.medication) meds.add(detail.medication);
        }
    }
    return [...meds];
}
