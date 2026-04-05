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

        const { analysisId, regenerate } = await request.json();

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

        // 이미 리포트가 있고 재생성 요청이 아니면 반환
        if (analysis.risk_report && !regenerate) {
            return NextResponse.json({ report: analysis.risk_report });
        }

        // medical_history에서 AnalysisResult 추출 (source 등 추가 필드 무시)
        const raw = analysis.medical_history as Record<string, unknown>;
        const medicalHistory: AnalysisResult = {
            analysisDate: (raw.analysisDate as string) || '',
            dataRange: (raw.dataRange as string) || '',
            items: Array.isArray(raw.items) ? raw.items : [],
            diseaseSummary: Array.isArray(raw.diseaseSummary) ? raw.diseaseSummary : [],
            riskFlags: Array.isArray(raw.riskFlags) ? raw.riskFlags : [],
            overallSummary: (raw.overallSummary as string) || '',
        };

        console.log('[RiskReport] items:', medicalHistory.items.length,
            'diseaseSummary:', medicalHistory.diseaseSummary?.length || 0,
            'overallSummary:', medicalHistory.overallSummary?.substring(0, 100));

        // Step 1: 매핑 테이블 기반 매칭
        const matchedRisks = matchRisks(medicalHistory);
        const profile = extractPatientProfile(medicalHistory);
        const medications = extractMedications(medicalHistory);

        console.log('[RiskReport] 매칭 결과:', matchedRisks.length, '건');
        console.log('[RiskReport] 질환코드:', [...profile.diseaseCodes]);
        console.log('[RiskReport] 약물:', medications.length, '건');

        // Step 2: 병력 요약 텍스트 구성 — AI에게 최대한 풍부한 맥락 제공
        const summaryParts: string[] = [];

        // 주요 질환
        const diseaseList = [...profile.diseaseNames.entries()].map(([code, name]) => `${name}(${code})`);
        summaryParts.push(`[주요 질환] ${diseaseList.length > 0 ? diseaseList.join(', ') : '진단코드 미확인'}`);

        // 복용 약물
        summaryParts.push(`[복용 약물] ${medications.length > 0 ? medications.join(', ') : '없음'}`);

        // 전체 요약
        if (medicalHistory.overallSummary) {
            summaryParts.push(`[전체 요약] ${medicalHistory.overallSummary}`);
        }

        // 질환별 상세
        if (medicalHistory.diseaseSummary && medicalHistory.diseaseSummary.length > 0) {
            summaryParts.push('[질환별 상세]');
            for (const ds of medicalHistory.diseaseSummary) {
                summaryParts.push(`- ${ds.diseaseName}(${ds.diseaseCode}): 최초 ${ds.firstDate}~최근 ${ds.lastDate}, ${ds.totalVisits}회 방문, 상태: ${ds.status}, 병원: ${ds.hospitals?.join(', ') || '-'}`);
            }
        }

        // 각 고지사항 항목의 summary
        const applicableItems = medicalHistory.items.filter(item => item.applicable && item.summary);
        if (applicableItems.length > 0) {
            summaryParts.push('[고지사항 요약]');
            for (const item of applicableItems) {
                summaryParts.push(`- [${item.category}] ${item.summary}`);
            }
        }

        // 위험 플래그
        if (medicalHistory.riskFlags && medicalHistory.riskFlags.length > 0) {
            summaryParts.push('[주의사항]');
            for (const rf of medicalHistory.riskFlags) {
                summaryParts.push(`- [${rf.severity}] ${rf.flag} → ${rf.recommendation}`);
            }
        }

        const medicalSummaryText = summaryParts.join('\n');

        // Step 3: 매칭 데이터 텍스트
        let matchedRisksText: string;
        if (matchedRisks.length > 0) {
            matchedRisksText = matchedRisks.map((r, i) =>
                `${i + 1}. [${r.sourceName}(${r.sourceCode})] → ${r.riskDisease} (${r.riskCategory})\n` +
                `   상대위험도: 일반인 대비 ${r.relativeRisk}배 | 위험수준: ${r.riskLevel} | 근거수준: ${r.evidenceLevel}\n` +
                `   근거: ${r.evidence}\n` +
                `   예상 발생 기간: 향후 ${r.timeframeYears}년`
            ).join('\n\n');
        } else {
            matchedRisksText = '(사전 매칭 데이터 없음 — 위 병력 요약을 기반으로 의학 통계에 근거한 위험 질환을 직접 분석해주세요. 각 항목에 relativeRisk, evidence, evidenceLevel을 반드시 포함하세요. 최소 3개 이상의 위험 질환을 분석해주세요.)';
        }

        // Step 4: Claude AI 호출
        const todayDate = new Date().toISOString().split('T')[0];
        const prompt = RISK_REPORT_PROMPT
            .replace('{TODAY_DATE}', todayDate)
            .replace('{MEDICAL_SUMMARY}', medicalSummaryText)
            .replace('{MATCHED_RISKS}', matchedRisksText);

        console.log('[RiskReport] AI 호출 시작, 프롬프트 길이:', prompt.length);

        const aiResponse = await callOpenAI({ prompt, maxTokens: 8000, retries: 1 });

        console.log('[RiskReport] AI 응답 길이:', aiResponse.length);

        let report: RiskReport;
        try {
            report = parseAIResponse<RiskReport>(aiResponse);
        } catch (parseError) {
            console.error('[RiskReport] AI 응답 파싱 실패:', (parseError as Error).message);
            console.error('[RiskReport] AI 원본 (500자):', aiResponse.substring(0, 500));
            throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
        }

        // 필수 필드 보정
        report.generatedAt = new Date().toISOString();
        if (!report.disclaimer) {
            report.disclaimer = '본 리포트는 건강보험심사평가원 진료 데이터와 의학 통계를 기반으로 작성된 참고 자료이며, 의학적 진단이나 의료 행위가 아닙니다. 개인의 실제 건강 상태는 전문 의료기관의 진찰을 통해 확인하시기 바랍니다.';
        }
        if (!report.riskItems) report.riskItems = [];
        if (!report.compoundRisks) report.compoundRisks = [];
        if (!report.medicalSummary) {
            report.medicalSummary = {
                mainDiseases: diseaseList.map(d => {
                    const match = d.match(/(.+)\((.+)\)/);
                    return { name: match?.[1] || d, code: match?.[2] || '' };
                }),
                currentMedications: medications,
                treatmentPattern: '진료 패턴 정보 없음',
            };
        }

        // riskItems 필드 보정 (AI가 riskLevel을 안 넣는 경우)
        for (const item of report.riskItems) {
            if (!item.riskLevel) {
                const rr = item.relativeRisk || 1;
                item.riskLevel = rr >= 3 ? 'high' : rr >= 1.8 ? 'moderate' : 'low';
            }
            if (!item.evidenceLevel) item.evidenceLevel = 'B';
        }

        // Step 5: DB 저장
        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                risk_report: report,
                updated_at: new Date().toISOString(),
            })
            .eq('id', analysisId);

        if (updateError) {
            console.error('[RiskReport] DB 저장 실패:', updateError);
        } else {
            console.log('[RiskReport] DB 저장 성공, riskItems:', report.riskItems.length, '건');
        }

        return NextResponse.json({ report });
    } catch (error) {
        console.error('[RiskReport] 전체 에러:', error);
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
