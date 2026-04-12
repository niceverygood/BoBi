// app/api/codef/health-checkup/route.ts
// 건강보험공단 건강검진 데이터 조회 (데모 키)
// - 건강검진결과: CODEF API (간편인증 필요)
// - 건강나이/뇌졸중/심뇌혈관: AI 예측 (건강검진 데이터 기반)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchHealthCheckupResult, type HealthCheckupRequest } from '@/lib/codef/client';
import { callOpenAI } from '@/lib/ai/openai';

export const maxDuration = 300;

// AI로 건강나이/질병위험도 예측
async function predictHealthWithAI(checkupData: unknown): Promise<{
    healthAge?: unknown;
    stroke?: unknown;
    cardio?: unknown;
}> {
    try {
        const systemPrompt = `당신은 건강검진 데이터를 분석하여 건강나이, 뇌졸중 위험도, 심뇌혈관 질환 위험도를 예측하는 의료 AI입니다.
응답은 반드시 유효한 JSON 형식으로만 반환하세요.`;

        const userPrompt = `아래 건강검진 데이터를 분석하여 3가지를 예측해주세요:

1. 건강나이: 실제 나이 대비 건강 상태를 나타내는 나이
2. 뇌졸중 10년 발병 위험도 (%)
3. 심뇌혈관 10년 발병 위험도 (%)

건강검진 데이터:
${JSON.stringify(checkupData, null, 2)}

다음 JSON 형식으로만 응답:
{
  "healthAge": {
    "resAge": "건강나이 (숫자)",
    "resChronologicalAge": "실제나이 (숫자)",
    "resNote": "간단한 해석 1-2문장"
  },
  "stroke": {
    "resRiskGrade": "위험등급 (낮음/보통/높음/매우높음)",
    "resRatio": "10년 발병확률 (%)",
    "resNote": "주요 위험요인 1-2문장"
  },
  "cardio": {
    "resRiskGrade": "위험등급 (낮음/보통/높음/매우높음)",
    "resRatio": "10년 발병확률 (%)",
    "resNote": "주요 위험요인 1-2문장"
  }
}`;

        const response = await callOpenAI({
            prompt: userPrompt,
            systemMessage: systemPrompt,
            fast: false,
            maxTokens: 1500,
        });

        // JSON 파싱
        const cleaned = response.replace(/```json\s*|\s*```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (err) {
        console.error('[HealthCheckup] AI 예측 에러:', err);
        return {};
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

        // 2단계: AI로 건강나이/뇌졸중/심뇌혈관 예측
        // (CODEF 추가 API는 2-way 세션 재사용 불가이므로 AI 대체)
        if (results.checkup) {
            try {
                const aiResults = await predictHealthWithAI(results.checkup);
                if (aiResults.healthAge) results.healthAge = aiResults.healthAge;
                if (aiResults.stroke) results.stroke = aiResults.stroke;
                if (aiResults.cardio) results.cardio = aiResults.cardio;
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

