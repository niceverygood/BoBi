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

        // 고객 정보 + 최신 분석 1건을 병렬 로드.
        // 과거엔 모든 분석의 모든 JSON 컬럼(`*`)을 전부 가져왔는데 수 MB 단위 전송 발생 →
        // summary 계산에 필요한 최신 1건의 필요 컬럼만 조회하도록 축소.
        const [customerRes, latestRes, metaRes] = await Promise.all([
            supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single(),
            supabase
                .from('analyses')
                .select('id, created_at, status, medical_history, product_eligibility, risk_report')
                .eq('customer_id', id)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1),
            supabase
                .from('analyses')
                .select('id, created_at, status', { count: 'exact' })
                .eq('customer_id', id)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        const customer = customerRes.data;
        if (!customer) return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });

        // 이력 메타만 (무거운 JSON 없음) — 프론트에서 이력 리스트 렌더링용
        const analyses = metaRes.data || [];
        // summary 계산은 최신 1건으로
        const latestAnalyses = latestRes.data || [];

        // 최신 분석에서 데이터 추출
        const latest = latestAnalyses[0];
        const medicalHistory = latest?.medical_history as Record<string, any> | null;
        const productEligibility = latest?.product_eligibility as Record<string, any> | null;
        const riskReport = latest?.risk_report as Record<string, any> | null;
        const hasHealthCheckup = !!(riskReport?.healthCheckupData || medicalHistory?.healthCheckupData);

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
                hasHealthCheckup,
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

        // 질환별 상세 정보 구성
        const diseases = mh?.diseaseSummary?.map((d: any) =>
            `${d.diseaseName}(${d.diseaseCode}): ${d.firstDate}~${d.lastDate}, ${d.status}, ${d.totalVisits}회 방문`
        ).join('\n') || '없음';

        const medications = extractMedications(mh || {}).join(', ') || '없음';

        const riskItems = rr?.riskItems?.map((r: any) =>
            `${r.sourceDisease} → ${r.riskDisease}: 일반인 대비 ${r.relativeRisk}배, 근거: ${r.evidence}`
        ).join('\n') || '없음';

        const eligibleProducts = pe?.products?.filter((p: any) => p.eligible === 'O')
            .map((p: any) => `${p.productName} (${p.eligibleText})`).join(', ') || '없음';

        // 나이 계산
        let age = '미상';
        if (customer.birth_date) {
            const birth = new Date(customer.birth_date);
            const now = new Date();
            age = `${now.getFullYear() - birth.getFullYear()}세`;
        }

        const prompt = `## 고객 정보
- 이름: ${customer.name}
- 성별: ${customer.gender === 'male' ? '남성' : customer.gender === 'female' ? '여성' : '미상'}
- 나이: ${age}
- 생년월일: ${customer.birth_date || '미상'}

## 현재 진단 및 치료 현황
${diseases}

## 복용 약물
${medications}

## AI 위험 질환 예측 (의학 통계 기반)
${riskItems}

## 가입 가능 보험 상품
${eligibleProducts}

## 병력 종합 요약
${mh?.overallSummary || '없음'}

---

위 데이터를 바탕으로 보험설계사가 이 고객에게 대면 상담 시 바로 말할 수 있는 상담 스크립트를 작성하세요.

### 반드시 포함해야 할 내용 (숫자 필수):

1. **실제 치료비 데이터** — 고객의 진단명 기반 위험 질환 발생 시 예상 치료비를 구체적으로 제시
   - 급성기 입원 치료비 (만원 단위)
   - 재활/통원 치료비 (만원 단위)
   - 장기 요양 시 월 비용
   - 예상 총 비용 합계

2. **고객 개인 리스크 수치**
   - "일반인 대비 N배" (위 AI 예측 데이터 활용)
   - 고객 연령대 + 진단명 조합의 향후 10년 내 발병 확률 (% 수치)
   - 건강보험심사평가원 통계 기준

3. **보험 있을 때 vs 없을 때 비교**
   - 보험 없을 경우: 예상 본인부담 금액
   - 보험 있을 경우: 예상 본인부담 금액
   - 차이 금액

### 금지 표현:
- "경제적 부담이 클 수 있습니다" → 대신 "약 3,000만원의 치료비가 발생합니다"
- "만약의 사태에 대비" → 대신 "뇌졸중 발병 확률 23%에 대비"
- "갑작스러운 의료비" → 대신 "급성기 입원 치료비 평균 1,200만원"
- 모든 추상적 표현을 구체적 숫자로 대체할 것

### 형식:
- 자연스러운 대화체 (설계사가 고객에게 말하는 톤)
- 5~7문단
- 마지막에 "지금 당장 가입이 아니라, 이 수치를 함께 검토해보고 싶습니다" 류의 소프트 클로징
- 보험 상품을 직접 추천하지 말 것`;

        const script = await callOpenAI({
            prompt,
            maxTokens: 2000,
            fast: false, // Sonnet으로 고품질 생성
            systemMessage: `당신은 보험설계사의 고객 상담을 돕는 AI입니다.

규칙:
- 자연스러운 한국어 대화체로 상담 스크립트를 작성하세요
- JSON이 아닌 일반 텍스트로 응답하세요
- 모든 리스크와 비용은 반드시 구체적 숫자(만원, %, 배수)로 표현하세요
- 치료비 데이터는 건강보험심사평가원 기준 평균 치료비를 활용하세요
- 추상적 표현("클 수 있습니다", "부담이 될 수 있어요") 사용 금지`,
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

// 고객 삭제 (관련 분석 이력도 cascade 삭제)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // 고객 소유권 확인
        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!customer) {
            return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 분석 이력 삭제
        await supabase.from('analyses').delete().eq('customer_id', id).eq('user_id', user.id);

        // 고객 삭제
        const { error: delError } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (delError) {
            return NextResponse.json({ error: delError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
