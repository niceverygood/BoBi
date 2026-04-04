// types/accident-receipt.ts

/** 질환 시나리오 입력 */
export interface AccidentScenario {
    diseaseCode: string;
    diseaseName: string;
    /** 급여 진료비 (만원) */
    coveredCost: number;
    /** 비급여 진료비 (만원) */
    uncoveredCost: number;
    /** 급여 본인부담 비율 (0~1) */
    coveredSelfPayRatio: number;
    /** 평균 투병 기간 (개월) */
    treatmentMonths: number;
    /** 고객 월 생활비 (만원) */
    monthlyLivingCost: number;
    /** 고객 현재 보험 수령 예상액 (만원) */
    insurancePayout: number;
}

/** 영수증 계산 결과 */
export interface AccidentReceipt {
    diseaseName: string;
    diseaseCode: string;
    /** 급여 진료비 (만원) */
    coveredCost: number;
    /** 비급여 진료비 (만원) */
    uncoveredCost: number;
    /** 총 진료비 (만원) = 급여 + 비급여 */
    totalMedicalCost: number;
    /** 건강보험 적용 금액 (만원) — 급여에서만 공제 */
    insuranceCoverage: number;
    /** 급여 본인부담금 (만원) */
    coveredSelfPay: number;
    /** 개인 부담금 합계 (만원) = 급여 본인부담 + 비급여 전액 */
    selfPayAmount: number;
    /** 설계 보험금 (만원) */
    insurancePayout: number;
    /** 생활비 총액 (만원) */
    totalLivingCost: number;
    /** 투병 기간 (개월) */
    treatmentMonths: number;
    /** 월 생활비 (만원) */
    monthlyLivingCost: number;
    /** 최종 수령 예상액 (만원) */
    finalAmount: number;
    /** 부족분 (만원) */
    shortage: number;
    /** 급여 본인부담 비율 */
    coveredSelfPayRatio: number;
    /** 면책 문구 */
    disclaimer: string;
    /** AI 분석 결과 */
    aiAnalysis?: {
        diseaseOverview: string;
        treatmentProcess: string;
        costBreakdown: string;
        lifeImpact: string;
        consultingPoints: string[];
    };
}
