// types/coverage.ts
// 보장 분석표 관련 타입 정의

/** 개별 보장 항목 */
export interface Coverage {
    coverage_name: string;
    coverage_amount: number;
    coverage_type: '진단' | '일당' | '수술' | '사망' | '실손' | '배상' | '후유장해' | '기타';
    category: string;
}

/** 개별 보험 계약 */
export interface Policy {
    insurer: string;
    product_name: string;
    policy_number?: string;
    contract_date: string;
    expiry_date: string;
    monthly_premium: number;
    status: '유지' | '실효' | '해지' | '만기';
    renewal_type?: '비갱신' | '갱신';
    coverages: Coverage[];
}

/** 고객 정보 */
export interface CustomerInfo {
    name: string;
    birth: string;
    gender: 'M' | 'F';
}

/** 보장 분석 입력 데이터 */
export interface CoverageInput {
    customer: CustomerInfo;
    policies: Policy[];
}

/** 보장 출처 (어느 보험사 어떤 상품에서) */
export interface CoverageSource {
    insurer: string;
    product: string;
    amount: number;
    expiry: string;
    renewal_type?: string;
}

/** 세부 카테고리 분석 결과 */
export interface SubcategoryAnalysis {
    name: string;
    total_amount: number;
    recommended_amount: number;
    status: '부족' | '적정' | '과다';
    gap: number;
    sources: CoverageSource[];
}

/** 카테고리 분석 결과 */
export interface CategoryAnalysis {
    category: string;
    icon: string;
    subcategories: SubcategoryAnalysis[];
}

/** 위험 알림 */
export interface RiskAlert {
    type: '부족보장' | '만기임박' | '중복가입' | '갱신주의';
    severity: 'high' | 'medium' | 'low';
    message: string;
    recommendation: string;
}

/** 종합 점수 */
export interface OverallScore {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
}

/** 고객 요약 */
export interface CustomerSummary {
    name: string;
    age: number;
    gender: string;
    total_monthly_premium: number;
    total_policies: number;
    active_policies: number;
}

/** AI 보장 분석 결과 전체 */
export interface CoverageAnalysisResult {
    customer_summary: CustomerSummary;
    coverage_analysis: CategoryAnalysis[];
    risk_alerts: RiskAlert[];
    overall_score: OverallScore;
}
