// types/risk-report.ts

export type RiskLevel = 'high' | 'moderate' | 'low';
export type EvidenceLevel = 'A' | 'B' | 'C';
export type RiskCategory = '심혈관' | '대사' | '신장' | '암' | '근골격' | '정신' | '호흡기' | '소화기' | '신경' | '기타';

/** 개별 위험 질환 항목 */
export interface RiskReportItem {
    sourceDisease: string;
    sourceCode: string;
    riskDisease: string;
    riskCategory: RiskCategory;
    relativeRisk: number;
    riskLevel: RiskLevel;
    explanation: string;
    evidence: string;
    evidenceLevel: EvidenceLevel;
}

/** 복합 위험 요인 */
export interface CompoundRisk {
    diseases: string[];
    effect: string;
    additionalRisk: string;
}

/** 전체 리포트 */
export interface RiskReport {
    generatedAt: string;
    medicalSummary: {
        mainDiseases: { name: string; code: string; firstDate?: string; lastDate?: string }[];
        currentMedications: string[];
        treatmentPattern: string;
    };
    riskItems: RiskReportItem[];
    compoundRisks: CompoundRisk[];
    overallAssessment: string;
    disclaimer: string;
}
