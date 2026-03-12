// types/analysis.ts

export interface MedicalDetail {
    date: string;
    hospital: string;
    diagnosisCode: string;
    diagnosisName: string;
    type: '외래' | '입원' | '수술' | '투약';
    duration: string;
    medication?: string;
    ingredient?: string;
    note?: string;
}

export interface AnalysisItem {
    category:
    | '3months_visit'
    | '3months_medication'
    | '1year_hospitalization'
    | '2year_hospitalization'
    | '5year_major_disease'
    | 'ongoing_medication';
    question: string;
    applicable: boolean;
    details: MedicalDetail[];
    summary: string;
}

export interface RiskFlag {
    flag: string;
    severity: 'high' | 'medium' | 'low';
    recommendation: string;
}

export interface DiseaseSummary {
    diseaseName: string;
    diseaseCode: string;
    firstDate: string;
    lastDate: string;
    totalVisits: string;
    treatmentPeriod: string;
    status: string;
    hospitals: string[];
}

export interface AnalysisResult {
    analysisDate: string;
    dataRange: string;
    items: AnalysisItem[];
    diseaseSummary?: DiseaseSummary[];
    riskFlags: RiskFlag[];
    overallSummary: string;
}

export interface ProductReason {
    question: string;
    answer: '예' | '아니오';
    detail: string;
}

export interface ProductEligibility {
    productType: 'simple' | 'mild' | 'standard';
    productName: string;
    eligible: 'O' | 'X' | '△';
    eligibleText: string;
    reasons: ProductReason[];
    recommendation: string;
}

export interface SimpleInsuranceType {
    type: string;
    nYears: string;
    eligible: 'O' | 'X' | '△';
    reason: string;
}

export interface ProductResult {
    products: ProductEligibility[];
    simpleInsuranceDetail?: {
        availableTypes: SimpleInsuranceType[];
        bestType: string;
        note: string;
    };
    exceptionDiseaseNote?: string;
    bestOption: string;
    tips: string;
}

export interface ApplicableClause {
    clauseType: string;
    claimable: boolean;
    reason: string;
    estimatedAmount?: string;
    howToClaim?: string;
}

export interface ClaimableItem {
    treatmentDate: string;
    hospital: string;
    diagnosis: string;
    treatmentType: '외래' | '입원' | '수술';
    applicableClauses: ApplicableClause[];
}

export interface ClaimResult {
    claimableItems: ClaimableItem[];
    totalClaimable: string;
    summary: string;
    importantNotes: string[];
}
