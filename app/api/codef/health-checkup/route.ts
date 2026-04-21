// app/api/codef/health-checkup/route.ts
// 건강보험공단 건강검진 데이터 조회 (프로덕션 CODEF — api.codef.io)
// - 건강검진결과: CODEF API (간편인증 필요)
// - 뇌졸중/심뇌혈관 10년 예측: AI 보조 예측 (건강검진 수치 기반)
//
// 건강나이(healthAge)는 데이터 품질 이슈로 2026-04 제거됨.
// 대신 실측 수치(BMI·혈압·혈당·콜레스테롤 등)와 뇌졸중·심뇌혈관 예측만 제공.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchHealthCheckupResult, type HealthCheckupRequest } from '@/lib/codef/client';
import { callOpenAI } from '@/lib/ai/openai';

export const maxDuration = 300;

// AI로 뇌졸중/심뇌혈관 예측
type PredictedSection = { resRiskGrade?: string; resRatio?: string; resNote?: string };
interface AiPrediction {
    stroke?: PredictedSection;
    cardio?: PredictedSection;
}

function hasRiskSection(v: unknown): v is PredictedSection {
    const o = v as PredictedSection | undefined;
    return !!(o && o.resRiskGrade);
}

async function predictHealthWithAI(checkupData: unknown): Promise<{
    result: AiPrediction;
    missing: string[];
}> {
    const systemPrompt = `당신은 건강검진 데이터를 분석하여 뇌졸중 위험도와 심뇌혈관 질환 위험도를 예측하는 의료 AI입니다.
반드시 2개 섹션(stroke, cardio) 모두를 포함한 유효한 JSON만 반환하세요. 어떤 경우에도 섹션을 생략하지 마세요.
데이터가 부족하면 보수적으로 "보통" 등급으로 추정하고 resNote에 근거 부족을 명시하세요.`;

    const buildPrompt = (extraInstruction = '') => `아래 건강검진 데이터를 분석하여 2가지를 예측해주세요:

1. 뇌졸중 (stroke) 10년 발병 위험도 (%)
2. 심뇌혈관 (cardio) 10년 발병 위험도 (%)

건강검진 데이터:
${JSON.stringify(checkupData, null, 2)}
${extraInstruction}
아래 JSON 스키마로만 응답하세요. 두 섹션 모두 필수입니다:
{
  "stroke": {
    "resRiskGrade": "낮음 | 보통 | 높음 | 매우높음 중 하나",
    "resRatio": "10년 발병확률 % (예: \\"3.2%\\")",
    "resNote": "주요 위험요인 1-2문장"
  },
  "cardio": {
    "resRiskGrade": "낮음 | 보통 | 높음 | 매우높음 중 하나",
    "resRatio": "10년 발병확률 % (예: \\"4.5%\\")",
    "resNote": "주요 위험요인 1-2문장"
  }
}`;

    const callAndParse = async (prompt: string): Promise<AiPrediction> => {
        const response = await callOpenAI({
            prompt,
            systemMessage: systemPrompt,
            fast: false,
            maxTokens: 1200,
        });
        const cleaned = response.replace(/```json\s*|\s*```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace
            ? cleaned.slice(firstBrace, lastBrace + 1)
            : cleaned;
        return JSON.parse(jsonSlice) as AiPrediction;
    };

    try {
        let parsed: AiPrediction = {};
        try {
            parsed = await callAndParse(buildPrompt());
        } catch (err) {
            console.error('[HealthCheckup] AI 1차 예측 파싱 실패:', err);
        }

        // 섹션이 누락됐으면 한 번 더 시도
        const firstMissing: string[] = [];
        if (!hasRiskSection(parsed.stroke)) firstMissing.push('stroke');
        if (!hasRiskSection(parsed.cardio)) firstMissing.push('cardio');

        if (firstMissing.length > 0) {
            try {
                const retryPrompt = buildPrompt(
                    `\n⚠️ 이전 응답에서 ${firstMissing.join(', ')} 섹션이 누락되었거나 필수 필드가 비어 있었습니다. 반드시 두 섹션 모두를 채워 주세요.\n`,
                );
                const retried = await callAndParse(retryPrompt);
                if (!hasRiskSection(parsed.stroke) && hasRiskSection(retried.stroke)) {
                    parsed.stroke = retried.stroke;
                }
                if (!hasRiskSection(parsed.cardio) && hasRiskSection(retried.cardio)) {
                    parsed.cardio = retried.cardio;
                }
            } catch (err) {
                console.error('[HealthCheckup] AI 재시도 실패:', err);
            }
        }

        const missing: string[] = [];
        if (!hasRiskSection(parsed.stroke)) {
            delete parsed.stroke;
            missing.push('뇌졸중 위험도');
        }
        if (!hasRiskSection(parsed.cardio)) {
            delete parsed.cardio;
            missing.push('심뇌혈관 위험도');
        }

        return { result: parsed, missing };
    } catch (err) {
        console.error('[HealthCheckup] AI 예측 에러:', err);
        return { result: {}, missing: ['뇌졸중 위험도', '심뇌혈관 위험도'] };
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const {
            userName, identity, phoneNo,
            loginType = '5', loginTypeLevel, authMethod, telecom,
            is2Way, twoWayInfo, simpleAuth, smsAuthNo, sessionId,
        } = body;

        if (!userName || !identity || !phoneNo) {
            return NextResponse.json({ error: '이름, 주민등록번호, 전화번호가 필요합니다.' }, { status: 400 });
        }

        const params: HealthCheckupRequest = {
            userName,
            identity: identity.replace(/-/g, ''),
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            authMethod,
            telecom,
            is2Way,
            twoWayInfo,
            simpleAuth,
            smsAuthNo,
            id: sessionId || `bobi-hc-${user.id.substring(0, 8)}-${Date.now()}`,
        };

        console.log('[HealthCheckup] Request:', { userName: userName.substring(0, 1) + '**', loginType, is2Way: !!is2Way });

        const results: Record<string, unknown> = {};
        const errors: string[] = [];

        // 1단계: CODEF API로 건강검진결과 조회 (간편인증)
        try {
            const { data, requires2Way, twoWayData } = await fetchHealthCheckupResult(params);
            if (requires2Way) {
                return NextResponse.json({
                    requires2Way: true,
                    twoWayData,
                    sessionId: params.id,
                });
            }
            results.checkup = data;
        } catch (err) {
            const msg = (err as Error).message;
            console.error('[HealthCheckup] 건강검진결과 에러:', msg);
            errors.push(`건강검진결과: ${msg}`);

            return NextResponse.json({
                error: `건강검진 데이터 조회 실패: ${msg}`,
            }, { status: 500 });
        }

        // 2단계: AI로 뇌졸중/심뇌혈관 예측
        // (CODEF 추가 API는 2-way 세션 재사용 불가이므로 AI 대체)
        // 건강나이는 데이터 품질 이슈로 제거 (2026-04).
        if (results.checkup) {
            try {
                const { result: aiResults, missing } = await predictHealthWithAI(results.checkup);
                if (aiResults.stroke) results.stroke = aiResults.stroke;
                if (aiResults.cardio) results.cardio = aiResults.cardio;
                if (missing.length > 0) {
                    errors.push(`AI 위험도 일부 생성 실패: ${missing.join(', ')}`);
                }
            } catch (err) {
                errors.push(`AI 위험도 분석: ${(err as Error).message}`);
            }
        }

        return NextResponse.json({
            results,
            errors: errors.length > 0 ? errors : undefined,
            sessionId: params.id,
        });
    } catch (error) {
        console.error('[HealthCheckup] Error:', error);
        return NextResponse.json({
            error: `건강검진 조회 중 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}

