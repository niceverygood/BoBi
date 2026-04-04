// app/api/accident-receipt/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { parseAIResponse } from '@/lib/ai/parser';
import type { AccidentScenario, AccidentReceipt } from '@/types/accident-receipt';

export const maxDuration = 300;

const AI_PROMPT = `당신은 한국 보험 상담 전문가입니다. 아래 질병 시나리오에 대해 설계사가 고객 상담에 활용할 수 있는 분석을 작성하세요.

## 질환 정보
- 질환명: {DISEASE_NAME}
- 질병코드: {DISEASE_CODE}
- 예상 총 진료비: {TOTAL_COST}만원
- 건강보험 후 본인부담: {SELF_PAY}만원 (부담률 {SELF_PAY_RATIO}%)
- 투병 기간: {TREATMENT_MONTHS}개월
- 월 생활비: {MONTHLY_LIVING}만원
- 설계 보험금: {INSURANCE_PAYOUT}만원
- 최종 잔액: {FINAL_AMOUNT}만원

## 출력 형식 (JSON)
{
  "diseaseOverview": "이 질환에 대한 개요 2~3문장. 발생 빈도, 주요 연령대, 위험성 포함.",
  "treatmentProcess": "주요 치료 과정 설명. 수술, 항암, 재활 등 단계별 설명.",
  "costBreakdown": "비용 구조 설명. 급여/비급여 비중, 고가 항목, 숨은 비용 등.",
  "lifeImpact": "투병 중 생활 영향. 소득 중단, 간병 비용, 심리적 영향 등.",
  "consultingPoints": [
    "설계사가 고객에게 전달할 핵심 메시지 1",
    "핵심 메시지 2",
    "핵심 메시지 3"
  ]
}

## 규칙
- 한국어로 작성
- 설계사가 고객한테 바로 말할 수 있는 쉬운 문체
- 보험 상품을 직접 추천하지 말 것
- 구체적 숫자와 현실적 사례 포함
`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const scenario: AccidentScenario = await request.json();

        if (!scenario.diseaseName || scenario.totalMedicalCost <= 0) {
            return NextResponse.json({ error: '질환명과 진료비를 입력해주세요.' }, { status: 400 });
        }

        // 계산
        const totalMedicalCost = scenario.totalMedicalCost;
        const selfPayRatio = scenario.selfPayRatio;
        const insuranceCoverage = Math.round(totalMedicalCost * (1 - selfPayRatio));
        const selfPayAmount = Math.round(totalMedicalCost * selfPayRatio);
        const totalLivingCost = scenario.monthlyLivingCost * scenario.treatmentMonths;
        const insurancePayout = scenario.insurancePayout;
        const finalAmount = insurancePayout - selfPayAmount - totalLivingCost;

        // AI 분석 호출
        const prompt = AI_PROMPT
            .replace('{DISEASE_NAME}', scenario.diseaseName)
            .replace('{DISEASE_CODE}', scenario.diseaseCode || '-')
            .replace('{TOTAL_COST}', String(totalMedicalCost))
            .replace('{SELF_PAY}', String(selfPayAmount))
            .replace('{SELF_PAY_RATIO}', String(Math.round(selfPayRatio * 100)))
            .replace('{TREATMENT_MONTHS}', String(scenario.treatmentMonths))
            .replace('{MONTHLY_LIVING}', String(scenario.monthlyLivingCost))
            .replace('{INSURANCE_PAYOUT}', String(insurancePayout))
            .replace('{FINAL_AMOUNT}', String(finalAmount));

        let aiAnalysis: AccidentReceipt['aiAnalysis'] = undefined;
        try {
            const aiResponse = await callOpenAI({ prompt, maxTokens: 2000, retries: 1 });
            aiAnalysis = parseAIResponse(aiResponse) as AccidentReceipt['aiAnalysis'];
        } catch (err) {
            console.error('[AccidentReceipt] AI 분석 실패:', err);
            // AI 실패해도 영수증은 반환
        }

        const receipt: AccidentReceipt = {
            diseaseName: scenario.diseaseName,
            diseaseCode: scenario.diseaseCode,
            totalMedicalCost,
            insuranceCoverage,
            selfPayAmount,
            insurancePayout,
            totalLivingCost,
            treatmentMonths: scenario.treatmentMonths,
            monthlyLivingCost: scenario.monthlyLivingCost,
            finalAmount,
            shortage: finalAmount,
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
