// app/api/risk-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { RISK_REPORT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { matchRisks, extractMedications, extractPatientProfile } from '@/lib/risk/risk-matcher';
import type { AnalysisResult } from '@/types/analysis';
import type { RiskReport } from '@/types/risk-report';

export const maxDuration = 300;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { analysisId } = await request.json();

        if (!analysisId) {
            return NextResponse.json({ error: '분석 ID가 필요합니다.' }, { status: 400 });
        }

        // 기존 분석 결과 조회
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single();

        if (analysisError || !analysis) {
            return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
        }

        if (!analysis.medical_history) {
            return NextResponse.json({ error: 'STEP 1 분석이 먼저 완료되어야 합니다.' }, { status: 400 });
        }

        // 이미 리포트가 있으면 반환
        if (analysis.risk_report) {
            return NextResponse.json({ report: analysis.risk_report });
        }

        const medicalHistory = analysis.medical_history as AnalysisResult;

        // Step 1: 매핑 테이블 기반 매칭 (검증된 데이터)
        const matchedRisks = matchRisks(medicalHistory);

        if (matchedRisks.length === 0) {
            return NextResponse.json({
                error: '매칭된 위험 질환이 없습니다. 병력 데이터에 진단코드가 포함되어 있는지 확인해주세요.',
            }, { status: 400 });
        }

        // Step 2: 의학 요약 데이터 구성
        const profile = extractPatientProfile(medicalHistory);
        const medications = extractMedications(medicalHistory);

        const medicalSummaryText = [
            `[주요 질환] ${[...profile.diseaseNames.entries()].map(([code, name]) => `${name}(${code})`).join(', ') || '없음'}`,
            `[복용 약물] ${medications.join(', ') || '없음'}`,
            `[전체 요약] ${medicalHistory.overallSummary || '없음'}`,
            medicalHistory.diseaseSummary?.map(ds =>
                `- ${ds.diseaseName}(${ds.diseaseCode}): ${ds.firstDate}~${ds.lastDate}, ${ds.totalVisits}회 방문, ${ds.status}`
            ).join('\n') || '',
        ].filter(Boolean).join('\n');

        const matchedRisksText = matchedRisks.map((r, i) =>
            `${i + 1}. [${r.sourceName}(${r.sourceCode})] → ${r.riskDisease} (${r.riskCategory})\n` +
            `   상대위험도: ${r.relativeRisk}배 | 위험수준: ${r.riskLevel} | 근거수준: ${r.evidenceLevel}\n` +
            `   근거: ${r.evidence}`
        ).join('\n\n');

        // Step 3: Claude AI 호출 — 매칭 데이터를 환자 맥락으로 해석
        const todayDate = new Date().toISOString().split('T')[0];
        const prompt = RISK_REPORT_PROMPT
            .replace('{TODAY_DATE}', todayDate)
            .replace('{MEDICAL_SUMMARY}', medicalSummaryText)
            .replace('{MATCHED_RISKS}', matchedRisksText);

        const aiResponse = await callOpenAI({ prompt, maxTokens: 8000 });

        let report: RiskReport;
        try {
            report = parseAIResponse<RiskReport>(aiResponse);
        } catch (parseError) {
            console.error('Risk report AI parse failed:', (parseError as Error).message);
            throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
        }

        // generatedAt 강제 설정
        report.generatedAt = new Date().toISOString();

        // Step 4: DB 저장
        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                risk_report: report,
                updated_at: new Date().toISOString(),
            })
            .eq('id', analysisId);

        if (updateError) {
            console.error('Risk report save error:', updateError);
            // 저장 실패해도 리포트는 반환
        }

        return NextResponse.json({ report });
    } catch (error) {
        console.error('Risk report error:', error);
        const rawMsg = (error as Error).message || '';
        const userMsg = rawMsg.includes('did not match')
            || rawMsg.includes('violates')
            || rawMsg.includes('connection')
            ? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            : rawMsg;
        return NextResponse.json({
            error: `위험도 분석 중 오류가 발생했습니다: ${userMsg}`,
        }, { status: 500 });
    }
}
