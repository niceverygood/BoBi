// app/api/accident-receipt/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findDiseaseCost } from '@/lib/receipt/disease-cost-data';
import type { AccidentScenario, AccidentReceipt } from '@/types/accident-receipt';

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
        const shortage = finalAmount;

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
            shortage,
            disclaimer: '본 영수증은 평균 통계 기반 가상 시나리오이며, 실제 진료비와 보험금은 의료기관, 보험 가입 조건, 치료 방법에 따라 달라질 수 있습니다.',
        };

        return NextResponse.json({ receipt });
    } catch (error) {
        console.error('Accident receipt error:', error);
        return NextResponse.json({
            error: `영수증 생성 중 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
