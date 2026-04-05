// app/api/customers/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';

export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // 고객 정보
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!customer) return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });

        // 이 고객의 모든 분석 이력
        const { data: analyses } = await supabase
            .from('analyses')
            .select('*')
            .eq('customer_id', id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // 최신 분석에서 데이터 추출
        const latest = analyses?.[0];
        const medicalHistory = latest?.medical_history as Record<string, any> | null;
        const productEligibility = latest?.product_eligibility as Record<string, any> | null;
        const riskReport = latest?.risk_report as Record<string, any> | null;

        // 건강 점수 계산 (0~100)
        let healthScore = 100;
        let scoreFactors: string[] = [];

        if (medicalHistory) {
            const items = medicalHistory.items || [];
            const applicableCount = items.filter((i: any) => i.applicable).length;
            healthScore -= applicableCount * 5; // 해당 항목당 -5점
            if (applicableCount > 0) scoreFactors.push(`고지사항 ${applicableCount}개 해당 (-${applicableCount * 5}점)`);

            const diseases = medicalHistory.diseaseSummary || [];
            const activeCount = diseases.filter((d: any) => d.status === '현재 치료중').length;
            healthScore -= activeCount * 10; // 현재 치료중 질환당 -10점
            if (activeCount > 0) scoreFactors.push(`현재 치료중 ${activeCount}건 (-${activeCount * 10}점)`);

            const highRisks = (medicalHistory.riskFlags || []).filter((f: any) => f.severity === 'high').length;
            healthScore -= highRisks * 8;
            if (highRisks > 0) scoreFactors.push(`고위험 요인 ${highRisks}건 (-${highRisks * 8}점)`);
        }

        if (riskReport?.riskItems) {
            const highRiskItems = riskReport.riskItems.filter((r: any) => r.riskLevel === 'high').length;
            healthScore -= highRiskItems * 5;
            if (highRiskItems > 0) scoreFactors.push(`고위험 질환예측 ${highRiskItems}건 (-${highRiskItems * 5}점)`);
        }

        healthScore = Math.max(0, Math.min(100, healthScore));
        const healthGrade = healthScore >= 80 ? '양호' : healthScore >= 60 ? '주의' : healthScore >= 40 ? '위험' : '고위험';

        // 보장 갭 요약
        const coverageGaps: Array<{ disease: string; shortage: number }> = [];
        if (riskReport?.riskItems) {
            for (const risk of riskReport.riskItems.slice(0, 3)) {
                coverageGaps.push({
                    disease: risk.riskDisease,
                    shortage: 0, // 실제 영수증 데이터와 연동 시 계산
                });
            }
        }

        return NextResponse.json({
            customer,
            analyses: analyses || [],
            summary: {
                healthScore,
                healthGrade,
                scoreFactors,
                totalAnalyses: analyses?.length || 0,
                latestAnalysisDate: latest?.created_at || null,
                medicalHistory: medicalHistory ? {
                    overallSummary: medicalHistory.overallSummary,
                    diseaseCount: (medicalHistory.diseaseSummary || []).length,
                    activeDiseases: (medicalHistory.diseaseSummary || []).filter((d: any) => d.status === '현재 치료중'),
                    riskFlags: medicalHistory.riskFlags || [],
                    medications: extractMedications(medicalHistory),
                } : null,
                productEligibility: productEligibility ? {
                    products: productEligibility.products || [],
                    oCount: (productEligibility.products || []).filter((p: any) => p.eligible === 'O').length,
                    tCount: (productEligibility.products || []).filter((p: any) => p.eligible === '△').length,
                    xCount: (productEligibility.products || []).filter((p: any) => p.eligible === 'X').length,
                } : null,
                riskReport: riskReport ? {
                    riskItems: riskReport.riskItems || [],
                    compoundRisks: riskReport.compoundRisks || [],
                    overallAssessment: riskReport.overallAssessment,
                } : null,
                coverageGaps,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// 상담 스크립트 생성
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!customer) return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });

        const { data: analyses } = await supabase
            .from('analyses')
            .select('medical_history, product_eligibility, risk_report')
            .eq('customer_id', id)
            .order('created_at', { ascending: false })
            .limit(1);

        const latest = analyses?.[0];
        const mh = latest?.medical_history as Record<string, any> | null;
        const pe = latest?.product_eligibility as Record<string, any> | null;
        const rr = latest?.risk_report as Record<string, any> | null;

        const prompt = `고객 정보:
- 이름: ${customer.name}
- 성별: ${customer.gender === 'male' ? '남성' : customer.gender === 'female' ? '여성' : '미상'}
- 생년월일: ${customer.birth_date || '미상'}

병력 요약: ${mh?.overallSummary || '없음'}

위험 질환: ${rr?.riskItems?.map((r: any) => `${r.riskDisease}(${r.relativeRisk}배)`).join(', ') || '없음'}

가입가능 상품: ${pe?.products?.filter((p: any) => p.eligible === 'O').map((p: any) => p.productName).join(', ') || '없음'}

위 정보를 바탕으로 보험설계사가 이 고객에게 바로 말할 수 있는 상담 스크립트를 작성해주세요.
3~4문단, 자연스러운 대화체로. 보험 상품을 직접 추천하지 말고 "왜 보험이 필요한지"를 설명하는 방식으로.`;

        const script = await callOpenAI({
            prompt,
            maxTokens: 1000,
            fast: true,
            systemMessage: '당신은 보험설계사의 고객 상담을 돕는 AI입니다. 자연스러운 한국어 대화체로 상담 스크립트를 작성하세요. JSON이 아닌 일반 텍스트로 응답하세요.',
        });

        return NextResponse.json({ script: script.trim() });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

function extractMedications(mh: Record<string, any>): string[] {
    const meds = new Set<string>();
    for (const item of mh.items || []) {
        if (!item.applicable) continue;
        for (const d of item.details || []) {
            if (d.medication) meds.add(d.medication);
        }
    }
    return [...meds];
}
