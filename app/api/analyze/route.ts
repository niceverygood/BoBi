// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP1_ANALYSIS_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse, validateAnalysisResult } from '@/lib/ai/parser';
import { validateAndCorrectDates, formatCorrections } from '@/lib/ai/date-validator';
import { formatCodefRecordsAsText, formatMyMedicineAsText } from '@/lib/codef/formatter';
import type { AnalysisResult } from '@/types/analysis';

export const maxDuration = 120; // Claude needs more time for complex analyses
// Truncate text to stay within Claude's context window
// Claude Sonnet 4.5 supports 200K tokens (~800K chars), but we keep it reasonable
// ~4 chars per token, keep under 60K chars total (~15K tokens input)
const MAX_CHARS_PER_FILE = 20000;
const MAX_TOTAL_CHARS = 60000;

function truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    const halfMax = Math.floor(maxChars / 2);
    return (
        text.slice(0, halfMax) +
        '\n\n... (중간 생략) ...\n\n' +
        text.slice(-halfMax)
    );
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        // Check rate limit
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, analysis_count')
            .eq('id', user.id)
            .single();

        let useCredit = false;

        if (profile) {
            const limits: Record<string, number> = { basic: 50, pro: 200, enterprise: Infinity };
            const limit = limits[profile.plan] || 50;
            if (profile.analysis_count >= limit) {
                // 플랜 한도 초과 → 크레딧 확인
                const { data: creditData } = await supabase
                    .from('credit_balances')
                    .select('credits_remaining')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (creditData && creditData.credits_remaining > 0) {
                    useCredit = true; // 크레딧으로 분석 진행
                } else {
                    return NextResponse.json({
                        error: '이번 달 분석 한도를 초과했습니다. 크레딧을 구매하거나 플랜을 업그레이드해주세요.',
                    }, { status: 429 });
                }
            }
        }

        const { customerId, uploadIds, codefRecords, myMedicineRecords } = await request.json();
        const isCodef = !!codefRecords || !!myMedicineRecords;

        let combinedText: string;
        let sourceType: 'codef' | 'medicine' | 'pdf' = 'pdf';
        const textParts: string[] = [];

        if (codefRecords) {
            sourceType = 'codef';
            const { treats, drugs, cars } = codefRecords;
            textParts.push(formatCodefRecordsAsText(treats || [], drugs || [], cars || []));
        }
        if (myMedicineRecords) {
            sourceType = codefRecords ? 'codef' : 'medicine';
            textParts.push(formatMyMedicineAsText(myMedicineRecords));
        }

        if (textParts.length > 0) {
            combinedText = textParts.join('\n\n');
            if (!combinedText.trim() || (combinedText.includes('조회된 진료 기록이 없습니다') && combinedText.includes('조회된 투약 기록이 없습니다'))) {
                return NextResponse.json({ error: '분석할 데이터가 없습니다.' }, { status: 400 });
            }
        } else {
            // 기존 PDF 업로드 → 텍스트 추출
            if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
                return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
            }

            const { data: uploads, error: uploadError } = await supabase
                .from('uploads')
                .select('*')
                .in('id', uploadIds)
                .eq('user_id', user.id);

            if (uploadError || !uploads || uploads.length === 0) {
                return NextResponse.json({ error: '업로드된 파일을 찾을 수 없습니다.' }, { status: 404 });
            }

            combinedText = uploads
                .map((u) => truncateText(u.raw_text || '', MAX_CHARS_PER_FILE))
                .filter(Boolean)
                .join('\n\n---\n\n')
                .slice(0, MAX_TOTAL_CHARS);

            if (!combinedText.trim()) {
                return NextResponse.json({ error: 'PDF에서 텍스트를 추출할 수 없었습니다.' }, { status: 400 });
            }
        }

        // Create analysis record
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .insert({
                user_id: user.id,
                customer_id: customerId || null,
                upload_ids: isCodef ? [] : (uploadIds || []),
                status: 'processing',
            })
            .select()
            .single();

        if (analysisError || !analysis) {
            return NextResponse.json({ error: '분석 기록 생성에 실패했습니다.' }, { status: 500 });
        }

        // Call Claude AI — inject today's date so the AI calculates time periods correctly
        const todayDate = new Date().toISOString().split('T')[0]; // e.g. "2026-03-28"
        const prompt = STEP1_ANALYSIS_PROMPT
            .replace(/{TODAY_DATE}/g, todayDate)
            .replace('{PDF_TEXT}', combinedText);
        const aiResponse = await callOpenAI({ prompt, maxTokens: 32000 });

        let result: AnalysisResult;
        try {
            result = parseAIResponse<AnalysisResult>(aiResponse);
        } catch (parseError) {
            console.error('AI response parse failed:', (parseError as Error).message);
            console.error('Raw AI response (first 500 chars):', aiResponse.substring(0, 500));
            throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
        }

        if (!validateAnalysisResult(result as unknown as Record<string, unknown>)) {
            console.error('Validation failed for result:', JSON.stringify(result).substring(0, 500));
            throw new Error('AI 분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.');
        }

        // ⚠️ 핵심: 서버 사이드 날짜 검증 — AI의 기간 판정을 오늘 날짜 기준으로 재검증
        const dateValidation = validateAndCorrectDates(result, todayDate);
        if (dateValidation.corrected) {
            console.log('[DateValidator]', formatCorrections(dateValidation.corrections));
        }
        result = dateValidation.result;

        // Update analysis with results
        const medicalHistory = {
            ...(result as unknown as Record<string, unknown>),
            source: sourceType,
        };
        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                status: 'completed',
                medical_history: medicalHistory,
                disclosure_summary: {
                    items: result.items,
                    riskFlags: result.riskFlags,
                    overallSummary: result.overallSummary,
                    source: sourceType,
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', analysis.id);

        if (updateError) {
            console.error('Update error:', updateError);
        }

        // Increment analysis count
        try {
            await supabase.rpc('increment_analysis_count', { user_id: user.id });
        } catch {
            // Non-critical, ignore if RPC doesn't exist
        }

        // 크레딧으로 분석한 경우 차감
        if (useCredit) {
            try {
                await supabase.rpc('use_credit', { p_user_id: user.id });
            } catch {
                console.error('Credit deduction failed');
            }
        }

        return NextResponse.json({
            analysisId: analysis.id,
            result,
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({
            error: `분석 중 오류가 발생했습니다: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
