// lib/risk/risk-color.ts
//
// 위험배율(relativeRisk)에 대응하는 색상 토큰을 반환하는 단일 헬퍼.
//
// 도입 배경 (PR #35):
//   - 이종인 영업이사 5/2 카톡 원안: "2배 미만은 노랑, 2배 이상은 빨강으로 통일"
//   - 색이 string 등급(riskLevel)에 의존하던 분기를 가이드 §11.3.1 안티패턴으로 차단.
//   - 같은 배율은 항상 같은 색을 보장 — RiskGauge / 고객카드 / 위험 리포트가
//     동일 임계값을 공유한다.
//
// 등급 string('high'|'moderate'|'low')은 데이터 분류·라벨링 용도로 별도 채널 유지
// (lib/risk/risk-matcher.ts toRiskLevel). 색은 이 헬퍼가 단독 결정.

/** 위험배율 컷오프 (배수). risk-matcher.ts와 동기화된 값. */
export const RISK_THRESHOLD_HIGH = 2.0;

/** 위험배율 → tailwind 텍스트 색 클래스. */
export function getRiskColorByMultiplier(relativeRisk: number): string {
    return relativeRisk >= RISK_THRESHOLD_HIGH ? 'text-red-700' : 'text-amber-700';
}

/** 위험배율 → 배지 스타일(텍스트+배경+테두리) 클래스. RiskGauge·고객카드 등에서 공용. */
export function getRiskBadgeClassByMultiplier(relativeRisk: number): string {
    return relativeRisk >= RISK_THRESHOLD_HIGH
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
}

/** 위험배율 → 진하기(bar fill) 클래스. RiskGauge bar 등 시각적 강조용. */
export function getRiskBarClassByMultiplier(relativeRisk: number): string {
    return relativeRisk >= RISK_THRESHOLD_HIGH ? 'bg-red-500' : 'bg-amber-500';
}
