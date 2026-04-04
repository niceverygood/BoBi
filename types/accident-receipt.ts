// types/accident-receipt.ts

/** 질환 시나리오 입력 */
export interface AccidentScenario {
    diseaseCode: string;
    diseaseName: string;
    /** 총 진료비 (만원) — 공공 데이터 기반 자동 입력, 수동 조정 가능 */
    totalMedicalCost: number;
    /** 건강보험 급여 적용 후 개인부담금 비율 (0~1, 예: 0.2 = 20%) */
    selfPayRatio: number;
    /** 평균 투병 기간 (개월) — 디폴트 제공, 수동 조정 가능 */
    treatmentMonths: number;
    /** 고객 월 생활비 (만원) — 직접 입력 */
    monthlyLivingCost: number;
    /** 고객 현재 보험 수령 예상액 (만원) — 직접 입력 */
    insurancePayout: number;
}

/** 영수증 계산 결과 */
export interface AccidentReceipt {
    diseaseName: string;
    diseaseCode: string;
    /** 총 진료비 (만원) */
    totalMedicalCost: number;
    /** 건강보험 적용 금액 (만원) */
    insuranceCoverage: number;
    /** 개인 부담금 (만원) */
    selfPayAmount: number;
    /** 설계 보험금 (만원) */
    insurancePayout: number;
    /** 생활비 총액 (만원) = 월생활비 × 투병기간 */
    totalLivingCost: number;
    /** 투병 기간 (개월) */
    treatmentMonths: number;
    /** 월 생활비 (만원) */
    monthlyLivingCost: number;
    /** 최종 수령 예상액 (만원) = 보험금 - 개인부담금 - 생활비 */
    finalAmount: number;
    /** 부족분 (만원, 음수면 부족) */
    shortage: number;
    /** 면책 문구 */
    disclaimer: string;
    /** AI 분석 결과 */
    aiAnalysis?: {
        /** 질환 개요 (2~3문장) */
        diseaseOverview: string;
        /** 치료 과정 설명 */
        treatmentProcess: string;
        /** 비용 구조 설명 (급여/비급여 비중 등) */
        costBreakdown: string;
        /** 투병 중 생활 영향 */
        lifeImpact: string;
        /** 설계사 상담 포인트 (핵심 메시지 2~3개) */
        consultingPoints: string[];
    };
}
