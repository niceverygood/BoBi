// app/api/future-me/route.ts
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';
import { FUTURE_ME_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { DISEASE_COST_DATA } from '@/lib/receipt/disease-cost-data';
import type { RiskReport } from '@/types/risk-report';
import type {
    FutureMeResult,
    FutureMeScenario,
    CategoryAmount,
} from '@/types/future-me';
import { sumCategory } from '@/types/future-me';

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

function safeCategoryAmount(raw: unknown): CategoryAmount {
    const r = (raw || {}) as Record<string, unknown>;
    const n = (v: unknown): number => {
        const x = Number(v);
        return Number.isFinite(x) && x >= 0 ? Math.round(x) : 0;
    };
    return {
        cancer: n(r.cancer),
        brain: n(r.brain),
        cardio: n(r.cardio),
    };
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const {
            customerId,
            coveredAmount,            // 하위 호환 (합계)
            coveredAmountByCategory,  // 신규 — 카테고리별
            additionalPremium,
        } = await request.json();

        if (!customerId) {
            return NextResponse.json({ error: '고객 ID가 필요합니다.' }, { status: 400 });
        }

        // 카테고리별 입력 우선, 없으면 합계 → 균등 분배 폴백
        let coveredByCategory: CategoryAmount;
        if (coveredAmountByCategory && typeof coveredAmountByCategory === 'object') {
            coveredByCategory = safeCategoryAmount(coveredAmountByCategory);
        } else if (typeof coveredAmount === 'number' && coveredAmount > 0) {
            const per = Math.round(coveredAmount / 3);
            coveredByCategory = { cancer: per, brain: per, cardio: coveredAmount - per * 2 };
        } else {
            return NextResponse.json(
                { error: '보험으로 보장되는 금액(카테고리별 또는 합계)을 입력해주세요.' },
                { status: 400 },
            );
        }

        const coveredTotal = sumCategory(coveredByCategory);
        if (coveredTotal <= 0) {
            return NextResponse.json(
                { error: '보장 금액 합계가 0보다 커야 합니다.' },
                { status: 400 },
            );
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
            .replace('{COVERED_CANCER}', String(coveredByCategory.cancer))
            .replace('{COVERED_BRAIN}', String(coveredByCategory.brain))
            .replace('{COVERED_CARDIO}', String(coveredByCategory.cardio))
            .replace('{COVERED_TOTAL}', String(coveredTotal))
            .replace('{ADDITIONAL_PREMIUM}', String(additionalPremium));

        console.log(`[FutureMe] AI 호출: ${customer.name}, age=${customerAge}, topDisease=${topDiseaseName}, covered=${JSON.stringify(coveredByCategory)}`);

        const aiResponse = await callClaude({ prompt, maxTokens: 4500, retries: 1 });

        interface RawScenario {
            type?: string;
            label?: string;
            badge?: string;
            estimatedCostByCategory?: unknown;
            coverageByCategory?: unknown;
            selfPayByCategory?: unknown;
            rejectionRisk?: string;
            premiumNote?: string;
            details?: string;
        }
        interface RawResult {
            riskSummary?: unknown;
            estimatedCostByCategory?: unknown;
            currentCoverageByCategory?: unknown;
            coverageGapByCategory?: unknown;
            scenarios?: RawScenario[];
            aiSummary?: string;
        }
        const parsed = parseAIResponse<RawResult>(aiResponse);

        const estimatedCostByCategory = safeCategoryAmount(parsed.estimatedCostByCategory) ;
        // 기본값 폴백 — AI가 안 주거나 0이면
        if (sumCategory(estimatedCostByCategory) === 0) {
            estimatedCostByCategory.cancer = 3500;
            estimatedCostByCategory.brain = 2200;
            estimatedCostByCategory.cardio = 2000;
        }
        const estimatedTotalCost = sumCategory(estimatedCostByCategory);

        const currentCoverageByCategory = safeCategoryAmount(parsed.currentCoverageByCategory);
        if (sumCategory(currentCoverageByCategory) === 0) {
            currentCoverageByCategory.cancer = Math.round(coveredByCategory.cancer * 0.25);
            currentCoverageByCategory.brain = Math.round(coveredByCategory.brain * 0.25);
            currentCoverageByCategory.cardio = Math.round(coveredByCategory.cardio * 0.25);
        }
        const currentCoverage = sumCategory(currentCoverageByCategory);

        const coverageGapByCategory: CategoryAmount = {
            cancer: Math.max(0, estimatedCostByCategory.cancer - currentCoverageByCategory.cancer),
            brain: Math.max(0, estimatedCostByCategory.brain - currentCoverageByCategory.brain),
            cardio: Math.max(0, estimatedCostByCategory.cardio - currentCoverageByCategory.cardio),
        };
        const coverageGap = sumCategory(coverageGapByCategory);

        const rawScenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
        const scenarios: FutureMeScenario[] = rawScenarios.map((s) => {
            const est = safeCategoryAmount(s.estimatedCostByCategory);
            // 비용은 전체 동일하게 유지 (시나리오마다 다르게 주면 UI 혼란)
            if (sumCategory(est) === 0) {
                est.cancer = estimatedCostByCategory.cancer;
                est.brain = estimatedCostByCategory.brain;
                est.cardio = estimatedCostByCategory.cardio;
            }
            const cov = safeCategoryAmount(s.coverageByCategory);
            const self: CategoryAmount = {
                cancer: Math.max(0, est.cancer - cov.cancer),
                brain: Math.max(0, est.brain - cov.brain),
                cardio: Math.max(0, est.cardio - cov.cardio),
            };
            return {
                type: (s.type === 'delay' || s.type === 'nothing' ? s.type : 'complement') as FutureMeScenario['type'],
                label: s.label ||
                    (s.type === 'delay' ? '5년 후 가입을 시도한다면'
                        : s.type === 'nothing' ? '아무것도 하지 않는다면'
                            : '지금 보험을 보완한다면'),
                badge: s.badge || (s.type === 'delay' ? '위험' : s.type === 'nothing' ? '최악' : '권장'),
                estimatedCostByCategory: est,
                estimatedTotalCost: sumCategory(est),
                coverageByCategory: cov,
                coverageAmount: sumCategory(cov),
                selfPayByCategory: self,
                selfPayAmount: sumCategory(self),
                rejectionRisk: s.rejectionRisk,
                premiumNote: s.premiumNote,
                details: s.details || '',
            };
        });

        // 시나리오가 3개 미만이면 폴백으로 채움
        const types: Array<FutureMeScenario['type']> = ['complement', 'delay', 'nothing'];
        const byType = new Map(scenarios.map(s => [s.type, s]));
        for (const t of types) {
            if (!byType.has(t)) {
                const cov: CategoryAmount = t === 'complement'
                    ? { ...coveredByCategory }
                    : t === 'delay'
                        ? {
                            cancer: Math.round(coveredByCategory.cancer * 0.4),
                            brain: Math.round(coveredByCategory.brain * 0.4),
                            cardio: Math.round(coveredByCategory.cardio * 0.4),
                        }
                        : { ...currentCoverageByCategory };
                const est = { ...estimatedCostByCategory };
                const self: CategoryAmount = {
                    cancer: Math.max(0, est.cancer - cov.cancer),
                    brain: Math.max(0, est.brain - cov.brain),
                    cardio: Math.max(0, est.cardio - cov.cardio),
                };
                byType.set(t, {
                    type: t,
                    label: t === 'complement' ? '지금 보험을 보완한다면'
                        : t === 'delay' ? '5년 후 가입을 시도한다면'
                            : '아무것도 하지 않는다면',
                    badge: t === 'complement' ? '권장' : t === 'delay' ? '위험' : '최악',
                    estimatedCostByCategory: est,
                    estimatedTotalCost: sumCategory(est),
                    coverageByCategory: cov,
                    coverageAmount: sumCategory(cov),
                    selfPayByCategory: self,
                    selfPayAmount: sumCategory(self),
                    details: '',
                });
            }
        }
        const orderedScenarios = types.map(t => byType.get(t)!).filter(Boolean);

        const result: FutureMeResult = {
            generatedAt: new Date().toISOString(),
            customerName: customer.name,
            customerAge,
            gender: genderDisplay,
            riskSummary: Array.isArray(parsed.riskSummary)
                ? (parsed.riskSummary as FutureMeResult['riskSummary'])
                : [],
            estimatedCostByCategory,
            estimatedTotalCost,
            currentCoverageByCategory,
            currentCoverage,
            coveredAmountByCategory: coveredByCategory,
            coveredAmount: coveredTotal,
            additionalPremium,
            coverageGapByCategory,
            coverageGap,
            scenarios: orderedScenarios,
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
