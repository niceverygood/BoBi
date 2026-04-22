// app/api/future-me/route.ts
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';
import { FUTURE_ME_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { DISEASE_COST_DATA } from '@/lib/receipt/disease-cost-data';
import { getUserPlan, canAccessProFeature } from '@/lib/subscription/access';
import { getLatestClientHealthCheckup, rowToResults } from '@/lib/health-checkup/storage';
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

/**
 * 건강검진 원본을 AI 프롬프트에 넣을 짧은 문자열로 요약한다. 없으면 "미연동".
 *
 * 데이터 출처:
 *   - 검진 수치(BMI/혈압/혈당/콜레스테롤/GFR/간기능/판정)
 *       → NHIS 건강보험공단 실제 측정값 (CODEF 프로덕션 연동)
 *   - 뇌졸중/심뇌혈관 10년 예측
 *       → 검진 수치 기반 AI 보조 예측 (2-way 재인증 회피용)
 *
 * 건강나이(healthAge)는 데이터 품질 이슈로 2026-04 제거됨.
 */
function summarizeHealthCheckup(raw: unknown): string {
    if (!raw || typeof raw !== 'object') return '미연동';
    const d = raw as Record<string, unknown>;
    const lines: string[] = [];

    // ── NHIS 실제 측정 수치 ──
    const checkup = d.checkup as Record<string, unknown> | undefined;
    const preview = (checkup?.resPreviewList as Array<Record<string, unknown>> | undefined)?.[0];
    if (preview) {
        lines.push('[NHIS 공단 측정 수치]');
        if (preview.resCheckupYear) lines.push(`- 검진년도: ${preview.resCheckupYear}`);
        if (preview.resBMI) lines.push(`- BMI: ${preview.resBMI} (정상 18.5~24.9)`);
        if (preview.resBloodPressure) lines.push(`- 혈압: ${preview.resBloodPressure} mmHg (정상 <120/80)`);
        if (preview.resFastingBloodSuger) lines.push(`- 공복혈당: ${preview.resFastingBloodSuger} mg/dL (정상 <100)`);
        if (preview.resTotalCholesterol) {
            const parts = [`총 ${preview.resTotalCholesterol}`];
            if (preview.resHDLCholesterol) parts.push(`HDL ${preview.resHDLCholesterol}`);
            if (preview.resLDLCholesterol) parts.push(`LDL ${preview.resLDLCholesterol}`);
            if (preview.resTriglyceride) parts.push(`중성지방 ${preview.resTriglyceride}`);
            lines.push(`- 콜레스테롤: ${parts.join(' / ')} mg/dL`);
        }
        if (preview.resGFR) lines.push(`- 신사구체여과율(GFR): ${preview.resGFR} mL/min (정상 >60)`);
        if (preview.resAST || preview.resALT) {
            lines.push(`- 간기능: AST ${preview.resAST ?? '-'} / ALT ${preview.resALT ?? '-'} U/L`);
        }
        if (preview.resJudgement) lines.push(`- 종합판정: ${preview.resJudgement}`);
    }

    // ── 질환별 10년 발병 예측 ──
    // 각 예측에 _source 필드가 있으면 NHIS 공단 공식 데이터(CODEF 프로덕션),
    // 없거나 'ai'면 검진 수치 기반 AI 보조 예측. 라벨을 출처별로 분기.
    const stroke = d.stroke as Record<string, unknown> | undefined;
    const cardio = d.cardio as Record<string, unknown> | undefined;
    const hasPred = stroke?.resRiskGrade || cardio?.resRiskGrade;
    if (hasPred) {
        if (lines.length > 0) lines.push('');
        const strokeIsNhis = stroke?._source === 'nhis';
        const cardioIsNhis = cardio?._source === 'nhis';
        const allNhis = (!stroke?.resRiskGrade || strokeIsNhis) && (!cardio?.resRiskGrade || cardioIsNhis);
        const anyNhis = strokeIsNhis || cardioIsNhis;
        lines.push(
            allNhis && anyNhis
                ? '[NHIS 공단 공식 10년 발병 예측]'
                : anyNhis
                    ? '[질환별 10년 발병 예측 — 항목별 출처 상이]'
                    : '[질환별 10년 발병 예측 — 검진 수치 기반]',
        );
        if (stroke?.resRiskGrade) {
            const ratio = stroke.resRatio ? ` (${stroke.resRatio})` : '';
            const tag = strokeIsNhis ? ' · NHIS 공단 공식' : '';
            lines.push(`- 뇌졸중 10년 예측${tag}: ${stroke.resRiskGrade}${ratio}`);
        }
        if (cardio?.resRiskGrade) {
            const ratio = cardio.resRatio ? ` (${cardio.resRatio})` : '';
            const tag = cardioIsNhis ? ' · NHIS 공단 공식' : '';
            lines.push(`- 심뇌혈관 10년 예측${tag}: ${cardio.resRiskGrade}${ratio}`);
        }
    }

    return lines.length > 0 ? lines.join('\n') : '미연동';
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        // 플랜 권한 체크 — 미래의 나는 Pro 전용
        const plan = await getUserPlan(supabase, user.id);
        if (!canAccessProFeature(plan, 'future_me')) {
            return NextResponse.json(
                { error: '미래의 나 기능은 프로 플랜 이상에서 이용 가능합니다.' },
                { status: 403 },
            );
        }

        const {
            customerId,
            coveredAmount,                // 하위 호환 (합계)
            coveredAmountByCategory,      // 신규 — 카테고리별 설계 보험금
            currentInsuranceByCategory,   // 신규 — 설계사가 직접 입력한 현재 보유 보험 (카테고리별)
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

        // 현재 보유 보험 (설계사 입력) — 없으면 모두 0 (기존 보험 없음으로 가정)
        const currentInsuranceInput: CategoryAmount = currentInsuranceByCategory
            ? safeCategoryAmount(currentInsuranceByCategory)
            : { cancer: 0, brain: 0, cardio: 0 };

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

        // 프롬프트 슬림화 — 상위 5개만 전달 (과거 10개)
        const riskItemsText = riskReport.riskItems
            .slice(0, 5)
            .map((item, i) =>
                `${i + 1}. ${item.riskDisease} (${item.riskCategory})\n` +
                `   - 상대위험도: ${item.relativeRisk}배 | 위험수준: ${item.riskLevel}`
            ).join('\n');

        // 건강검진 데이터 추출
        //   1순위: client_health_checkups 테이블 (고객 단위 영구 저장)
        //   2순위: analysis.risk_report.healthCheckupData (과거 분석에 붙여 저장)
        //   3순위: analysis.medical_history.healthCheckupData (레거시)
        let rawHealthCheckup: unknown = null;
        const clientCheckup = await getLatestClientHealthCheckup(svc, customerId);
        if (clientCheckup) {
            rawHealthCheckup = rowToResults(clientCheckup);
        } else {
            rawHealthCheckup = (analysis.risk_report as unknown as Record<string, unknown>)?.healthCheckupData
                || (analysis.medical_history as unknown as Record<string, unknown>)?.healthCheckupData;
        }
        const healthCheckupText = summarizeHealthCheckup(rawHealthCheckup);
        const hasHealthCheckup = healthCheckupText !== '미연동';

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

        const currentInsuranceTotal = sumCategory(currentInsuranceInput);

        const todayDate = new Date().toISOString().split('T')[0];
        const prompt = FUTURE_ME_PROMPT
            .replace('{TODAY_DATE}', todayDate)
            .replace('{CUSTOMER_NAME}', customer.name)
            .replace('{GENDER}', genderDisplay)
            .replace('{AGE}', String(customerAge))
            .replace('{RISK_ITEMS}', riskItemsText || '(위험도 데이터 없음)')
            .replace('{HEALTH_CHECKUP_DATA}', healthCheckupText)
            .replace('{TOP_DISEASE_NAME}', topDiseaseName)
            .replace('{ESTIMATED_COST}', String(estimatedCost))
            .replace('{COVERED_COST}', String(coveredCost))
            .replace('{UNCOVERED_COST}', String(uncoveredCost))
            .replace('{TREATMENT_MONTHS}', String(treatmentMonths))
            .replace('{COVERED_CANCER}', String(coveredByCategory.cancer))
            .replace('{COVERED_BRAIN}', String(coveredByCategory.brain))
            .replace('{COVERED_CARDIO}', String(coveredByCategory.cardio))
            .replace('{COVERED_TOTAL}', String(coveredTotal))
            .replace('{CURRENT_CANCER}', String(currentInsuranceInput.cancer))
            .replace('{CURRENT_BRAIN}', String(currentInsuranceInput.brain))
            .replace('{CURRENT_CARDIO}', String(currentInsuranceInput.cardio))
            .replace('{CURRENT_TOTAL}', String(currentInsuranceTotal))
            .replace('{ADDITIONAL_PREMIUM}', String(additionalPremium));

        console.log(`[FutureMe] AI 호출: ${customer.name}, age=${customerAge}, topDisease=${topDiseaseName}, hasCheckup=${hasHealthCheckup}`);

        // maxTokens 축소 (4500 → 2500) — 실제 응답 길이가 2000 토큰 이하로 충분
        const aiResponse = await callClaude({ prompt, maxTokens: 2500, retries: 1 });

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

        // ⭐ 현재 보유 보험은 "설계사 직접 입력값"을 그대로 사용 (AI/임의 추정 금지)
        // 설계사가 입력 안 하면 0원(= 기존 보험 없음)으로 처리
        const currentCoverageByCategory: CategoryAmount = { ...currentInsuranceInput };
        const currentCoverage = sumCategory(currentCoverageByCategory);

        const coverageGapByCategory: CategoryAmount = {
            cancer: Math.max(0, estimatedCostByCategory.cancer - currentCoverageByCategory.cancer),
            brain: Math.max(0, estimatedCostByCategory.brain - currentCoverageByCategory.brain),
            cardio: Math.max(0, estimatedCostByCategory.cardio - currentCoverageByCategory.cardio),
        };
        const coverageGap = sumCategory(coverageGapByCategory);

        // ⭐ 시나리오별 보장 금액은 "설계사 입력값 (현재 보험 + 설계 보험금)"으로 확정 계산
        //    AI가 산정한 값이 아닌, 설계사가 직접 입력한 값을 기반으로 자기부담금 정확히 계산
        //
        // A (지금 보완)   = 현재보험 + 설계보험
        // B (5년 후 가입) = 현재보험 + 설계보험 × 감소율 (고위험군일수록 낮음)
        // C (아무것도 안함) = 현재보험만

        // 5년 후 가입 시 보장 감소율 — 위험도 기반
        const highRiskCount = (riskReport.riskItems || [])
            .filter(r => r.riskLevel === 'high').length;
        const delayCoverageRate = highRiskCount >= 2 ? 0.10    // likely_decline
            : highRiskCount >= 1 ? 0.50                         // conditional
                : 0.85;                                         // likely_accept

        function computeScenarioCoverage(type: FutureMeScenario['type']): CategoryAmount {
            if (type === 'complement') {
                return {
                    cancer: currentInsuranceInput.cancer + coveredByCategory.cancer,
                    brain: currentInsuranceInput.brain + coveredByCategory.brain,
                    cardio: currentInsuranceInput.cardio + coveredByCategory.cardio,
                };
            }
            if (type === 'delay') {
                return {
                    cancer: currentInsuranceInput.cancer + Math.round(coveredByCategory.cancer * delayCoverageRate),
                    brain: currentInsuranceInput.brain + Math.round(coveredByCategory.brain * delayCoverageRate),
                    cardio: currentInsuranceInput.cardio + Math.round(coveredByCategory.cardio * delayCoverageRate),
                };
            }
            // nothing
            return { ...currentInsuranceInput };
        }

        function computeSelfPay(est: CategoryAmount, cov: CategoryAmount): CategoryAmount {
            return {
                cancer: Math.max(0, est.cancer - cov.cancer),
                brain: Math.max(0, est.brain - cov.brain),
                cardio: Math.max(0, est.cardio - cov.cardio),
            };
        }

        const rawScenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
        const rawByType = new Map<FutureMeScenario['type'], RawScenario>();
        for (const s of rawScenarios) {
            const t = (s.type === 'delay' || s.type === 'nothing') ? s.type : 'complement';
            rawByType.set(t as FutureMeScenario['type'], s);
        }

        const types: Array<FutureMeScenario['type']> = ['complement', 'delay', 'nothing'];
        const orderedScenarios: FutureMeScenario[] = types.map((t) => {
            const raw = rawByType.get(t);
            // 비용은 전체 동일 (암/뇌혈관/심혈관 평균 병원비 — 모든 시나리오 공통)
            const est = { ...estimatedCostByCategory };
            // 보장 금액은 설계사 입력 기반으로 강제 계산 (AI 산정 무시)
            const cov = computeScenarioCoverage(t);
            const self = computeSelfPay(est, cov);

            return {
                type: t,
                label: raw?.label ||
                    (t === 'complement' ? '지금 보험을 보완한다면'
                        : t === 'delay' ? '5년 후 가입을 시도한다면'
                            : '아무것도 하지 않는다면'),
                badge: raw?.badge || (t === 'complement' ? '권장' : t === 'delay' ? '위험' : '최악'),
                estimatedCostByCategory: est,
                estimatedTotalCost: sumCategory(est),
                coverageByCategory: cov,
                coverageAmount: sumCategory(cov),
                selfPayByCategory: self,
                selfPayAmount: sumCategory(self),
                rejectionRisk: raw?.rejectionRisk,
                premiumNote: raw?.premiumNote,
                details: raw?.details || '',
            };
        });

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

        // DB 저장 — 응답을 블로킹하지 않도록 fire-and-forget.
        // 카카오톡 공유·재조회는 이후 목록 조회에서 링크됨. 사용자는 즉시 결과를 본다.
        svc
            .from('future_me_reports')
            .insert({ user_id: user.id, customer_id: customerId, result })
            .then(({ error: saveErr }) => {
                if (saveErr) {
                    console.warn('[FutureMe] DB 저장 실패 (테이블 미존재 가능):', saveErr.message);
                }
            });

        return NextResponse.json({ result, reportId: null, hasHealthCheckup });
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
