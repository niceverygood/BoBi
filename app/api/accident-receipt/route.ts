// app/api/accident-receipt/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { parseAIResponse } from '@/lib/ai/parser';
import type { AccidentScenario, AccidentReceipt } from '@/types/accident-receipt';

export const maxDuration = 300;

const AI_PROMPT = `당신은 한국 보험 상담 전문가이자 의료비 데이터 분석가입니다. 아래 질병 시나리오에 대해 설계사가 고객 상담에 활용할 수 있는 분석을 작성하세요.

## 질환 정보
- 질환명: {DISEASE_NAME}
- 질병코드: {DISEASE_CODE}
- (심평원 평균) 급여 진료비: {COVERED_COST}만원 (건강보험 적용 대상)
- (심평원 평균) 비급여 진료비: {UNCOVERED_COST}만원 (전액 본인부담)
- 총 진료비: {TOTAL_COST}만원
- 급여 본인부담: {COVERED_SELF_PAY}만원 (급여의 {SELF_PAY_RATIO}%)
- 개인 부담 합계: {SELF_PAY}만원
- 투병 기간: {TREATMENT_MONTHS}개월
- 월 생활비: {MONTHLY_LIVING}만원
- 설계 보험금: {INSURANCE_PAYOUT}만원
- 최종 잔액: {FINAL_AMOUNT}만원

## 출력 형식 (반드시 이 JSON 구조)
{
  "diseaseOverview": "이 질환에 대한 개요 2~3문장. 발생 빈도, 주요 연령대, 위험성 포함.",
  "treatmentProcess": "주요 치료 과정 설명. 수술, 항암, 재활 등 단계별 설명.",
  "additionalTreatments": [
    {
      "name": "치료법 이름 (예: 표적항암치료)",
      "description": "치료 방법 설명 1~2문장",
      "estimatedCost": "예상 비용 범위 (예: 1,500~3,000만원)",
      "isCovered": "급여/비급여/혼합",
      "frequency": "치료 주기 (예: 3주 1회, 6개월 동안)"
    }
  ],
  "hiddenCosts": [
    {
      "item": "숨은 비용 항목 (예: 간병비, 면역치료제, 가발, 통원 교통비)",
      "estimatedCost": "예상 금액 (예: 월 200만원)",
      "explanation": "왜 발생하는지 1문장"
    }
  ],
  "costBreakdown": "비용 구조 설명. 심평원 평균과 실제 발생 가능한 금액의 차이, 비급여 비중, 고가 항목 등.",
  "lifeImpact": "투병 중 생활 영향. 소득 중단, 간병 비용, 심리적 영향 등.",
  "consultingPoints": [
    "설계사가 고객에게 전달할 핵심 메시지 1",
    "핵심 메시지 2",
    "핵심 메시지 3"
  ]
}

## 작성 규칙

**additionalTreatments 작성 시 (가장 중요):**
- 심평원 평균 통계에 잡히지 않는 **실제 환자가 받는 치료법**을 4~6개 작성
- 예시 (암 질환 시): 표적항암치료, 면역항암치료, 양성자 치료, 중입자 치료, 로봇 수술, 항암 보조요법, 재활 치료
- 예시 (심혈관 질환 시): 스텐트 시술, 관상동맥우회술, 심장 재활, 약물 용출 스텐트, ICD 삽입
- 예시 (뇌졸중 시): 혈전용해술, 기계적 혈전제거술, 재활치료, 언어치료, 작업치료
- 각 치료법의 **실제 시장 가격**을 포함 (반드시 만원 단위로 구체적 숫자)
- 비급여 항목은 환자가 가장 충격받는 부분 — 반드시 포함

**hiddenCosts 작성 시:**
- 진료비 영수증에 안 잡히지만 실제로 큰 부담이 되는 항목 3~5개
- 예: 간병비(월 200~400만원), 가발(150만원), 면역증강제(월 50만원), 비급여 약(월 100만원), 통원 교통비, 보호자 휴직 비용
- 각 항목의 구체적 금액 포함

**나머지 작성 규칙:**
- 한국어로 작성
- 설계사가 고객한테 바로 말할 수 있는 쉬운 문체 ("~합니다" 체)
- 보험 상품을 직접 추천하지 말 것
- 구체적 숫자와 현실적 사례 포함
- 심평원 평균보다 **실제 부담은 훨씬 클 수 있다는 점**을 강조
`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const scenario: AccidentScenario = await request.json();

        if (!scenario.diseaseName || (scenario.coveredCost + scenario.uncoveredCost) <= 0) {
            return NextResponse.json({ error: '질환명과 진료비를 입력해주세요.' }, { status: 400 });
        }

        // 급여/비급여 분리 계산
        const coveredCost = scenario.coveredCost;
        const uncoveredCost = scenario.uncoveredCost;
        const totalMedicalCost = coveredCost + uncoveredCost;
        const coveredSelfPayRatio = scenario.coveredSelfPayRatio;

        // 건강보험 적용: 급여에서만 공제 (비급여는 전액 본인부담)
        const coveredSelfPay = Math.round(coveredCost * coveredSelfPayRatio);
        const insuranceCoverage = coveredCost - coveredSelfPay;
        const selfPayAmount = coveredSelfPay + uncoveredCost; // 급여 본인부담 + 비급여 전액

        const totalLivingCost = scenario.monthlyLivingCost * scenario.treatmentMonths;
        const insurancePayout = scenario.insurancePayout;
        const finalAmount = insurancePayout - selfPayAmount - totalLivingCost;

        // AI 분석 호출
        const prompt = AI_PROMPT
            .replace('{DISEASE_NAME}', scenario.diseaseName)
            .replace('{DISEASE_CODE}', scenario.diseaseCode || '-')
            .replace('{COVERED_COST}', String(coveredCost))
            .replace('{UNCOVERED_COST}', String(uncoveredCost))
            .replace('{TOTAL_COST}', String(totalMedicalCost))
            .replace('{COVERED_SELF_PAY}', String(coveredSelfPay))
            .replace('{SELF_PAY}', String(selfPayAmount))
            .replace('{SELF_PAY_RATIO}', String(Math.round(coveredSelfPayRatio * 100)))
            .replace('{TREATMENT_MONTHS}', String(scenario.treatmentMonths))
            .replace('{MONTHLY_LIVING}', String(scenario.monthlyLivingCost))
            .replace('{INSURANCE_PAYOUT}', String(insurancePayout))
            .replace('{FINAL_AMOUNT}', String(finalAmount));

        let aiAnalysis: AccidentReceipt['aiAnalysis'] = undefined;
        try {
            const aiResponse = await callOpenAI({ prompt, maxTokens: 4000, retries: 1, fast: false });
            aiAnalysis = parseAIResponse(aiResponse) as AccidentReceipt['aiAnalysis'];
        } catch (err) {
            console.error('[AccidentReceipt] AI 분석 실패:', err);
            // AI 실패해도 영수증은 반환
        }

        const receipt: AccidentReceipt = {
            diseaseName: scenario.diseaseName,
            diseaseCode: scenario.diseaseCode,
            coveredCost,
            uncoveredCost,
            totalMedicalCost,
            insuranceCoverage,
            coveredSelfPay,
            selfPayAmount,
            insurancePayout,
            totalLivingCost,
            treatmentMonths: scenario.treatmentMonths,
            monthlyLivingCost: scenario.monthlyLivingCost,
            finalAmount,
            shortage: finalAmount,
            coveredSelfPayRatio,
            disclaimer: '본 영수증은 평균 통계 기반 가상 시나리오이며, 실제 진료비와 보험금은 의료기관, 보험 가입 조건, 치료 방법에 따라 달라질 수 있습니다.',
            aiAnalysis,
        };

        return NextResponse.json({ receipt });
    } catch (error) {
        console.error('Accident receipt error:', error);
        return NextResponse.json({
            error: `영수증 생성 중 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
