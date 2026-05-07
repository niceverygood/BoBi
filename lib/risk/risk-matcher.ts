// lib/risk/risk-matcher.ts
// 환자 병력 데이터 → 매핑 테이블 매칭 → 위험 질환 목록 추출

import { DISEASE_RISK_MAP, MEDICATION_DISEASE_MAP, type DiseaseRiskEntry } from './disease-risk-map';
import type { AnalysisResult } from '@/types/analysis';
import type { RiskLevel } from '@/types/risk-report';

export interface MatchedRisk extends DiseaseRiskEntry {
    riskLevel: RiskLevel;
    matchedFrom: 'diagnosis' | 'medication' | 'text';
}

export interface PatientProfile {
    diseaseCodes: Set<string>;
    diseaseNames: Map<string, string>; // code → name
    medications: string[];
    allText: string; // 전체 텍스트 (질환명 텍스트 매칭용)
}

/**
 * 질환명 → KCD 코드 매핑 (텍스트 기반 매칭용)
 * diagnosisCode가 없거나 비표준일 때 질환명 텍스트로 매칭
 */
const DISEASE_NAME_TO_CODE: { keywords: string[]; code: string; name: string }[] = [
    { keywords: ['고혈압', '혈압 높', 'hypertension'], code: 'I10', name: '고혈압' },
    { keywords: ['당뇨', '혈당', 'diabetes', '메트포르민'], code: 'E11', name: '제2형 당뇨병' },
    { keywords: ['이상지질', '고지혈', '고콜레스테롤', '콜레스테롤', 'dyslipidemia'], code: 'E78', name: '이상지질혈증' },
    { keywords: ['비만', 'obesity', 'BMI'], code: 'E66', name: '비만' },
    { keywords: ['우울', 'depression', '항우울'], code: 'F32', name: '우울증' },
    { keywords: ['심방세동', 'atrial fibrillation', '부정맥'], code: 'I48', name: '심방세동' },
    { keywords: ['COPD', '만성폐쇄', '폐기종', '기관지확장'], code: 'J44', name: 'COPD' },
    { keywords: ['지방간', 'fatty liver', 'NAFLD', 'NASH'], code: 'K76', name: '지방간질환' },
    { keywords: ['통풍', '요산', 'gout', '알로퓨리놀', '페북소스타트'], code: 'M10', name: '통풍' },
    { keywords: ['역류', 'GERD', '역류성', '식도염'], code: 'K21', name: '위식도역류질환' },
    { keywords: ['갑상선기능저하', '갑상선저하', '레보티록신', 'hypothyroid'], code: 'E03', name: '갑상선기능저하증' },
    { keywords: ['골다공', 'osteoporosis'], code: 'M81', name: '골다공증' },
    { keywords: ['천식', 'asthma'], code: 'J45', name: '천식' },
    { keywords: ['B형간염', 'B형 간염', 'HBV', '만성간염'], code: 'B18', name: '만성 바이러스간염' },
    { keywords: ['수면무호흡', '수면장애', 'sleep apnea'], code: 'G47', name: '수면장애' },
    { keywords: ['류마티스', 'rheumatoid', 'RA'], code: 'M05', name: '류마티스관절염' },
    { keywords: ['협심증', '심근경색', '관상동맥'], code: 'I25', name: '허혈성심장질환' },
    { keywords: ['뇌졸중', '뇌경색', '뇌출혈'], code: 'I63', name: '뇌졸중' },
    { keywords: ['만성콩팥', '신부전', '신장질환', 'CKD'], code: 'N18', name: '만성콩팥병' },
    { keywords: ['위염', '위궤양', 'gastritis'], code: 'K29', name: '위염' },
    { keywords: ['요추', '디스크', '추간판', '허리통증', '요통'], code: 'M51', name: '추간판질환' },
    { keywords: ['불면', 'insomnia'], code: 'G47', name: '수면장애' },
];

/** Step 1 분석 결과에서 환자 프로필 추출 */
export function extractPatientProfile(analysis: AnalysisResult): PatientProfile {
    const diseaseCodes = new Set<string>();
    const diseaseNames = new Map<string, string>();
    const medications: string[] = [];
    const textParts: string[] = [];

    // 1. items에서 진단코드 및 약물 수집
    for (const item of analysis.items) {
        if (!item.applicable) continue;
        if (item.summary) textParts.push(item.summary);

        for (const detail of item.details) {
            if (detail.diagnosisCode) {
                const code = normalizeCode(detail.diagnosisCode);
                if (code) {
                    diseaseCodes.add(code);
                    if (detail.diagnosisName) {
                        diseaseNames.set(code, detail.diagnosisName);
                    }
                }
            }
            if (detail.diagnosisName) textParts.push(detail.diagnosisName);
            if (detail.medication) {
                medications.push(detail.medication);
                textParts.push(detail.medication);
            }
            if (detail.ingredient) {
                medications.push(detail.ingredient);
                textParts.push(detail.ingredient);
            }
            if (detail.note) textParts.push(detail.note);
        }
    }

    // 2. diseaseSummary에서 추출
    for (const ds of analysis.diseaseSummary || []) {
        if (ds.diseaseCode) {
            const code = normalizeCode(ds.diseaseCode);
            if (code) {
                diseaseCodes.add(code);
                diseaseNames.set(code, ds.diseaseName);
            }
        }
        if (ds.diseaseName) textParts.push(ds.diseaseName);
        if (ds.status) textParts.push(ds.status);
    }

    // 3. riskFlags에서 추출
    for (const rf of analysis.riskFlags || []) {
        if (rf.flag) textParts.push(rf.flag);
        if (rf.recommendation) textParts.push(rf.recommendation);
    }

    // 4. overallSummary
    if (analysis.overallSummary) textParts.push(analysis.overallSummary);

    const allText = textParts.join(' ');

    return { diseaseCodes, diseaseNames, medications, allText };
}

/** 진단코드 정규화: "E11.9" → "E11", "E119" → "E11", etc. */
function normalizeCode(raw: string): string {
    const code = raw.trim().toUpperCase().replace(/[.\-\s]/g, '');
    // KCD 코드: 알파벳 1자 + 숫자 2~3자 (+ 선택적 소수점 이하)
    const match = code.match(/^([A-Z]\d{2,3})/);
    return match ? match[1] : code;
}

/** 약물에서 기저질환 코드 추정 */
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

/** 전체 텍스트에서 질환명 매칭 → 코드 추정 */
function inferDiseasesFromText(profile: PatientProfile): void {
    const textLower = profile.allText.toLowerCase();
    for (const mapping of DISEASE_NAME_TO_CODE) {
        for (const keyword of mapping.keywords) {
            if (textLower.includes(keyword.toLowerCase())) {
                if (!profile.diseaseCodes.has(mapping.code)) {
                    profile.diseaseCodes.add(mapping.code);
                    profile.diseaseNames.set(mapping.code, mapping.name);
                }
                break; // 하나만 매칭되면 됨
            }
        }
    }
}

/** KCD 코드 prefix 매칭 */
function codeMatches(patientCode: string, mapCode: string): boolean {
    return patientCode.startsWith(mapCode);
}

/** 상대위험도 → 위험 수준 변환.
 *  PR #35 (이종인 이사 5/2 원안): 2배 단일 컷오프로 sync. 1.0배 미만 케이스는
 *  사실상 매칭 데이터에 없어 'low'는 fallback으로만 남긴다. */
function toRiskLevel(rr: number): RiskLevel {
    if (rr >= 2.0) return 'high';
    if (rr >= 1.0) return 'moderate';
    return 'low';
}

/** 메인 매칭 함수: 환자 프로필 → 위험 질환 목록 */
export function matchRisks(analysis: AnalysisResult): MatchedRisk[] {
    const profile = extractPatientProfile(analysis);

    // 3단계 추론: 진단코드 → 약물 → 텍스트
    inferDiseasesFromMedications(profile);
    inferDiseasesFromText(profile);

    console.log('[RiskMatcher] 추출된 질환코드:', [...profile.diseaseCodes]);
    console.log('[RiskMatcher] 질환명:', Object.fromEntries(profile.diseaseNames));

    const matched: MatchedRisk[] = [];
    const seen = new Set<string>();

    for (const entry of DISEASE_RISK_MAP) {
        for (const patientCode of profile.diseaseCodes) {
            if (!codeMatches(patientCode, entry.sourceCode)) continue;

            const key = `${entry.sourceCode}:${entry.riskDisease}`;
            if (seen.has(key)) continue;
            seen.add(key);

            matched.push({
                ...entry,
                sourceName: profile.diseaseNames.get(patientCode) || entry.sourceName,
                riskLevel: toRiskLevel(entry.relativeRisk),
                matchedFrom: 'diagnosis',
            });
        }
    }

    matched.sort((a, b) => b.relativeRisk - a.relativeRisk);

    console.log('[RiskMatcher] 매칭 결과:', matched.length, '건');
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
