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

export interface ExceptionDiseaseCheck {
    insurer: string;
    isException: boolean;
    matchedDisease?: string;
    conditions?: string;
    result: string;
}

export interface ProductEligibility {
    productType: 'simple' | 'mild' | 'standard';
    productName: string;
    productCode?: string;          // 예: "305", "삼태노" 등 상품 코드/유형명
    insurers?: string[];           // 이 상품을 취급하는 보험사 목록
    eligible: 'O' | 'X' | '△';
    eligibleText: string;
    reasons: ProductReason[];
    exceptionDiseaseCheck?: ExceptionDiseaseCheck[];
    recommendation: string;
}

export interface SimpleInsuranceType {
    type: string;
    nYears: string;
    eligible: 'O' | 'X' | '△';
    reason: string;
}

export interface ExceptionDiseaseSummaryDetail {
    insurer: string;
    productType: string;
    matchedCount: number | string;
    recommendation: string;
}

export interface ProductResult {
    products: ProductEligibility[];
    simpleInsuranceDetail?: {
        availableTypes: SimpleInsuranceType[];
        bestType: string;
        note: string;
    };
    exceptionDiseaseSummary?: {
        totalMatchedInsurers: number | string;
        details: ExceptionDiseaseSummaryDetail[];
    };
    exceptionDiseaseNote?: string;
    bestOption: string;
    tips: string;
}

export interface ClaimResultItem {
    clauseType: string;
    claimable: string; // "O" | "X" | "△"
    claimableText: string;
    reason: string;
    excludedBy?: string;
}

export interface ClaimableItem {
    treatmentDate: string;
    hospital: string;
    diagnosis: string;
    diagnosisCode?: string;
    treatmentType: '외래' | '입원' | '수술';
    surgeryCode?: string;
    surgeryGrade?: string;
    claimResults: ClaimResultItem[];
}

export interface ClaimSummary {
    totalItems: string;
    claimableCount: string;
    notClaimableCount: string;
    needCheckCount: string;
}

export interface KeyFinding {
    finding: string;
    action: string;
}

export interface ClaimResult {
    claimableItems: ClaimableItem[];
    claimSummary: ClaimSummary;
    keyFindings: KeyFinding[];
    summary: string;
    importantNotes: string[];
}
