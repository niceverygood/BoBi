// app/api/risk-report/route.ts
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { RISK_REPORT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { matchRisks, extractMedications, extractPatientProfile } from '@/lib/risk/risk-matcher';
import { extractCheckupSnapshots, analyzeAllTrends, sortTrendsByPriority } from '@/lib/health/trend-analyzer';
import { anonymizeAnalysis, saveAnonymizedRecord, isOptedOut } from '@/lib/privacy/anonymizer';
import { getUserPlan, canAccessProFeature } from '@/lib/subscription/access';
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

        // 플랜 권한 체크 — 질병 위험도 리포트는 Pro 전용
        const plan = await getUserPlan(supabase, user.id);
        if (!canAccessProFeature(plan, 'risk_report')) {
            return NextResponse.json(
                { error: '질병 위험도 리포트는 프로 플랜 이상에서 이용 가능합니다.' },
                { status: 403 },
            );
        }

        const { analysisId, regenerate, healthCheckupData } = await request.json();

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

        // 건강검진 데이터 추가 (있는 경우)
        if (healthCheckupData) {
            summaryParts.push('\n[건강검진 결과 (건강보험공단)]');

            // 건강나이
            if (healthCheckupData.healthAge) {
                const ha = healthCheckupData.healthAge;
                summaryParts.push(`- 건강나이: ${ha.resAge}세 (실제 ${ha.resChronologicalAge}세)`);
                if (ha.resNote1) summaryParts.push(`- 소견: ${ha.resNote1}`);
                if (ha.resDetailList) {
                    for (const d of ha.resDetailList) {
                        summaryParts.push(`  · 위험요인 [${d.resRiskFactor}]: ${d.resState} → 권고: ${d.resRecommendValue}`);
                    }
                }
            }

            // 검진 수치
            if (healthCheckupData.checkup?.resPreviewList?.[0]) {
                const p = healthCheckupData.checkup.resPreviewList[0];
                summaryParts.push(`- 검진일: ${p.resCheckupYear}년`);
                if (p.resBMI) summaryParts.push(`- BMI: ${p.resBMI} (신장 ${p.resHeight}cm, 체중 ${p.resWeight}kg)`);
                if (p.resBloodPressure) summaryParts.push(`- 혈압: ${p.resBloodPressure} mmHg`);
                if (p.resFastingBloodSuger) summaryParts.push(`- 공복혈당: ${p.resFastingBloodSuger} mg/dL`);
                if (p.resTotalCholesterol) summaryParts.push(`- 총콜레스테롤: ${p.resTotalCholesterol} / HDL: ${p.resHDLCholesterol || '-'} / LDL: ${p.resLDLCholesterol || '-'} / 중성지방: ${p.resTriglyceride || '-'} mg/dL`);
                if (p.resGFR) summaryParts.push(`- 신사구체여과율(GFR): ${p.resGFR} mL/min`);
                if (p.resAST) summaryParts.push(`- 간기능: AST ${p.resAST} / ALT ${p.resALT} / y-GTP ${p.resyGPT} U/L`);
                if (p.resJudgement) summaryParts.push(`- 종합 판정: ${p.resJudgement}`);
                if (p.resOpinion) summaryParts.push(`- 소견: ${p.resOpinion}`);
            }

            // 뇌졸중 예측
            if (healthCheckupData.stroke?.resRiskGrade) {
                summaryParts.push(`- 뇌졸중 예측: ${healthCheckupData.stroke.resRiskGrade} (${healthCheckupData.stroke.resRatio || ''})`);
            }

            // 심뇌혈관 예측
            if (healthCheckupData.cardio?.resRiskGrade) {
                summaryParts.push(`- 심뇌혈관 질환예측: ${healthCheckupData.cardio.resRiskGrade} (${healthCheckupData.cardio.resRatio || ''})`);
            }

            // 연도별 추이 분석 (2년 이상 데이터가 있을 때)
            if (healthCheckupData.checkup) {
                const snapshots = extractCheckupSnapshots(healthCheckupData.checkup);
                if (snapshots.length >= 2) {
                    const trends = sortTrendsByPriority(analyzeAllTrends(snapshots));
                    const criticalTrends = trends.filter(t =>
                        t.currentStatus !== 'normal' || t.direction === 'worsening'
                    );
                    if (criticalTrends.length > 0) {
                        summaryParts.push('\n[연도별 추이 분석 (중요 지표)]');
                        for (const t of criticalTrends.slice(0, 8)) {
                            const pointsStr = t.points.map(p => `${p.year}년 ${p.value}${t.unit}`).join(' → ');
                            const statusKr = t.currentStatus === 'abnormal' ? '이상' : t.currentStatus === 'borderline' ? '경계' : '정상';
                            const dirKr = t.direction === 'worsening' ? '악화' : t.direction === 'improving' ? '개선' : '유지';
                            summaryParts.push(`- ${t.label}: ${pointsStr} (${statusKr}, ${dirKr} ${t.changeRate > 0 ? '+' : ''}${t.changeRate}%/년)`);
                            if (t.alert) summaryParts.push(`  · ${t.alert}`);
                        }
                    }
                }
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

        // 건강검진 데이터가 있으면 리포트에 포함시켜 UI에서 표시 가능하게
        if (healthCheckupData) {
            (report as unknown as Record<string, unknown>).healthCheckupData = healthCheckupData;
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

        // Step 6: 익명화 파이프라인 (백그라운드, 실패해도 본 API는 성공 반환)
        try {
            const svc = await createServiceClient();
            const optedOut = await isOptedOut(svc, user.id);
            if (!optedOut) {
                // 고객 식별 정보 조회 (customer_id가 있으면)
                let customerIdentity: string | undefined;
                let customerAddress: string | undefined;
                let customerGender: string | undefined;
                let customerBirthDate: string | undefined;
                if (analysis.customer_id) {
                    const { data: customer } = await svc
                        .from('customers')
                        .select('identity, address, gender, birth_date')
                        .eq('id', analysis.customer_id)
                        .maybeSingle();
                    if (customer) {
                        customerIdentity = customer.identity || undefined;
                        customerAddress = customer.address || undefined;
                        customerGender = customer.gender || undefined;
                        customerBirthDate = customer.birth_date || undefined;
                    }
                }

                const anonRecord = anonymizeAnalysis({
                    analysisId,
                    userId: user.id,
                    customerIdentity,
                    customerAddress,
                    customerGender,
                    customerBirthDate,
                    medicalHistory: analysis.medical_history,
                    riskReport: report,
                    healthCheckupData,
                });

                const result = await saveAnonymizedRecord(svc, anonRecord);
                if (result.success) {
                    console.log('[RiskReport] 익명화 데이터 저장 완료');
                } else {
                    console.warn('[RiskReport] 익명화 데이터 저장 실패 (non-critical):', result.error);
                }
            } else {
                console.log('[RiskReport] 이용자 opt-out 상태 — 익명화 저장 생략');
            }
        } catch (anonErr) {
            // 익명화는 절대로 본 API를 실패시키지 않음
            console.warn('[RiskReport] 익명화 파이프라인 에러 (무시):', (anonErr as Error).message);
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
