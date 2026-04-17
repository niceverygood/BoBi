// app/api/future-me/route.ts
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';
import { FUTURE_ME_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { DISEASE_COST_DATA } from '@/lib/receipt/disease-cost-data';
import type { RiskReport } from '@/types/risk-report';
import type { FutureMeResult } from '@/types/future-me';

export const maxDuration = 300;

function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { customerId, coveredAmount, additionalPremium } = await request.json();

        if (!customerId) {
            return NextResponse.json({ error: '고객 ID가 필요합니다.' }, { status: 400 });
        }
        if (!coveredAmount || coveredAmount <= 0) {
            return NextResponse.json({ error: '보장 금액을 입력해주세요.' }, { status: 400 });
        }
        if (additionalPremium === undefined || additionalPremium < 0) {
            return NextResponse.json({ error: '추가 월 보험료를 입력해주세요.' }, { status: 400 });
        }

        const svc = await createServiceClient();

        const { data: customer, error: customerError } = await svc
            .from('customers')
            .select('id, name, birth_date, gender')
            .eq('id', customerId)
            .eq('user_id', user.id)
            .single();

        if (customerError || !customer) {
            return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
        }

        const { data: analysis } = await svc
            .from('analyses')
            .select('id, risk_report, medical_history')
            .eq('customer_id', customerId)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .not('risk_report', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!analysis?.risk_report) {
            return NextResponse.json({
                error: '이 고객의 질병위험도 리포트가 없습니다. 먼저 병력 분석 → 위험도 리포트를 생성해주세요.',
            }, { status: 400 });
        }

        const riskReport = analysis.risk_report as unknown as RiskReport;
        const customerAge = customer.birth_date ? calculateAge(customer.birth_date) : 40;
        const genderDisplay = customer.gender === 'male' ? '남성' : customer.gender === 'female' ? '여성' : '미입력';

        const riskItemsText = riskReport.riskItems
            .slice(0, 10)
            .map((item, i) =>
                `${i + 1}. ${item.riskDisease} (${item.riskCategory})\n` +
                `   - 상대위험도: ${item.relativeRisk}배 | 위험수준: ${item.riskLevel}\n` +
                `   - 근거: ${item.evidence || item.explanation}`
            ).join('\n\n');

        const topRiskItem = riskReport.riskItems[0];
        const topDiseaseCost = topRiskItem
            ? DISEASE_COST_DATA.find(d =>
                d.name.includes(topRiskItem.riskDisease) ||
                topRiskItem.riskDisease.includes(d.name) ||
                d.code === topRiskItem.sourceCode
            )
            : null;

        const estimatedCost = topDiseaseCost
            ? topDiseaseCost.avgCoveredCost + topDiseaseCost.avgUncoveredCost
            : 4800;
        const coveredCost = topDiseaseCost?.avgCoveredCost ?? 3000;
        const uncoveredCost = topDiseaseCost?.avgUncoveredCost ?? 1800;
        const treatmentMonths = topDiseaseCost?.avgTreatmentMonths ?? 12;
        const topDiseaseName = topRiskItem?.riskDisease ?? '주요 질환';

        const todayDate = new Date().toISOString().split('T')[0];
        const prompt = FUTURE_ME_PROMPT
            .replace('{TODAY_DATE}', todayDate)
            .replace('{CUSTOMER_NAME}', customer.name)
            .replace('{GENDER}', genderDisplay)
            .replace('{AGE}', String(customerAge))
            .replace('{RISK_ITEMS}', riskItemsText || '(위험도 데이터 없음)')
            .replace('{TOP_DISEASE_NAME}', topDiseaseName)
            .replace('{ESTIMATED_COST}', String(estimatedCost))
            .replace('{COVERED_COST}', String(coveredCost))
            .replace('{UNCOVERED_COST}', String(uncoveredCost))
            .replace('{TREATMENT_MONTHS}', String(treatmentMonths))
            .replace('{COVERED_AMOUNT}', String(coveredAmount))
            .replace('{ADDITIONAL_PREMIUM}', String(additionalPremium));

        console.log(`[FutureMe] AI 호출: ${customer.name}, age=${customerAge}, topDisease=${topDiseaseName}`);

        const aiResponse = await callClaude({ prompt, maxTokens: 4000, retries: 1 });
        const parsed = parseAIResponse<Omit<FutureMeResult, 'generatedAt' | 'customerName' | 'customerAge' | 'gender' | 'coveredAmount' | 'additionalPremium' | 'disclaimer'>>(aiResponse);

        const result: FutureMeResult = {
            generatedAt: new Date().toISOString(),
            customerName: customer.name,
            customerAge,
            gender: genderDisplay,
            riskSummary: parsed.riskSummary || [],
            estimatedTotalCost: parsed.estimatedTotalCost || estimatedCost,
            currentCoverage: parsed.currentCoverage || Math.round(coveredAmount * 0.25),
            coveredAmount,
            additionalPremium,
            coverageGap: parsed.coverageGap || (estimatedCost - Math.round(coveredAmount * 0.25)),
            scenarios: parsed.scenarios || [],
            aiSummary: parsed.aiSummary || '',
            disclaimer: '본 리포트는 의학 통계 및 AI 분석 기반의 참고 자료이며, 실제 보험 인수 심사, 보험료, 보장 금액은 보험사 및 상품에 따라 달라질 수 있습니다.',
        };

        return NextResponse.json({ result });
    } catch (error) {
        console.error('[FutureMe] 에러:', error);
        const rawMsg = (error as Error).message || '';
        const userMsg = rawMsg.includes('did not match')
            || rawMsg.includes('violates')
            || rawMsg.includes('connection')
            ? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            : rawMsg;
        return NextResponse.json({
            error: `리포트 생성 중 오류가 발생했습니다: ${userMsg}`,
        }, { status: 500 });
    }
}
