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

// ─── 비교보장표 타입 ─────────────────────────────────────────

/** 비교보장 항목 (현재 vs 추천) */
export interface ComparisonItem {
    category: string;
    subcategory: string;
    current_amount: number;
    recommended_amount: number;
    gap: number;
    status: '부족' | '적정' | '과다';
    current_sources: string[];     // "삼성생명 500만원" 형태
    recommendation: string;        // "3,000만원 추가 가입 권장"
}

/** 비교보장표 전체 */
export interface ComparisonTable {
    customer_name: string;
    analysis_date: string;
    items: ComparisonItem[];
    total_current_premium: number;
    estimated_additional_premium: number;
    summary: string;
}

// ─── 리모델링 제안서 타입 ────────────────────────────────────

/** 기존 보험 유지/해지/변경 판정 */
export interface PolicyAction {
    insurer: string;
    product_name: string;
    monthly_premium: number;
    contract_date: string;
    expiry_date: string;
    action: '유지' | '해지 권장' | '변경 검토' | '감액 검토';
    reason: string;
    priority: 'high' | 'medium' | 'low';
    key_coverages: string[];       // 주요 보장 항목
    savings_if_cancelled?: number; // 해지 시 절감 보험료
}

/** 신규 가입 추천 */
export interface NewPolicyRecommendation {
    category: string;              // "암 진단비", "뇌혈관" 등
    coverage_name: string;
    recommended_amount: number;
    current_gap: number;
    suggested_insurer?: string;
    suggested_product?: string;
    estimated_premium: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
}

/** 리모델링 제안서 전체 */
export interface RemodelingProposal {
    customer_name: string;
    customer_age: number;
    customer_gender: string;
    analysis_date: string;
    current_score: number;
    expected_score: number;        // 리모델링 후 예상 점수

    // 기존 보험 판정
    policy_actions: PolicyAction[];

    // 신규 가입 추천
    new_recommendations: NewPolicyRecommendation[];

    // 요약
    total_current_premium: number;
    total_after_premium: number;      // 리모델링 후 예상 총 보험료
    premium_change: number;           // 보험료 증감

    executive_summary: string;        // 1~2문단 종합 의견
    action_steps: string[];           // 설계사 실행 단계
    important_notes: string[];        // 주의사항
}
