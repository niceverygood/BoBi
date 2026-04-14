// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP1_ANALYSIS_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse, validateAnalysisResult } from '@/lib/ai/parser';
import { validateAndCorrectDates, formatCorrections } from '@/lib/ai/date-validator';
import { formatCodefRecordsAsText, formatMyMedicineAsText } from '@/lib/codef/formatter';
import type { AnalysisResult } from '@/types/analysis';

export const maxDuration = 300; // Vercel Pro: 최대 300초
// Truncate text to stay within Claude's context window
// Claude Sonnet 4.5 supports 200K tokens (~800K chars), but we keep it reasonable
// ~4 chars per token, 40K chars (~10K tokens) = faster AI response
const MAX_CHARS_PER_FILE = 15000;
const MAX_TOTAL_CHARS = 40000;

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

        // Check rate limit (usage_tracking 기반, service role로 RLS 우회)
        let useCredit = false;
        const svcClientForCheck = await createServiceClient();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;

        const { data: usageData } = await svcClientForCheck
            .from('usage_tracking')
            .select('analyses_used, analyses_limit')
            .eq('user_id', user.id)
            .eq('period_start', periodStart)
            .maybeSingle();

        const used = usageData?.analyses_used || 0;
        const limit = usageData?.analyses_limit || 5; // 기본 무료 플랜 5건

        console.log(`[Analyze] 한도 체크: ${used}/${limit} (user: ${user.id.substring(0, 8)})`);

        if (used >= limit) {
            // 한도 초과 → 크레딧 확인
            const { data: creditData } = await svcClientForCheck
                .from('credit_balances')
                .select('credits_remaining')
                .eq('user_id', user.id)
                .maybeSingle();

            if (creditData && creditData.credits_remaining > 0) {
                useCredit = true;
            } else {
                return NextResponse.json({
                    error: '이번 달 분석 한도를 초과했습니다. 크레딧을 구매하거나 플랜을 업그레이드해주세요.',
                }, { status: 429 });
            }
        }

        const { customerId, uploadIds, codefRecords, myMedicineRecords } = await request.json();
        const isCodef = !!codefRecords || !!myMedicineRecords;

        let combinedText: string;
        let sourceType: 'codef' | 'medicine' | 'pdf' = 'pdf';
        const textParts: string[] = [];
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validIds: string[] = [];

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

            // UUID 형식 검증 — 잘못된 ID가 Supabase 쿼리에 들어가면 "The string did not match the expected pattern" 에러 발생
            validIds = uploadIds.filter((id: string) => typeof id === 'string' && UUID_RE.test(id));
            if (validIds.length === 0) {
                return NextResponse.json({ error: '유효한 업로드 ID가 없습니다.' }, { status: 400 });
            }

            const { data: uploads, error: uploadError } = await supabase
                .from('uploads')
                .select('*')
                .in('id', validIds)
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
                upload_ids: isCodef ? [] : validIds,
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
        const aiResponse = await callOpenAI({ prompt, maxTokens: 16000, retries: 1 });

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

        // Increment analysis count (legacy profile counter)
        try {
            await supabase.rpc('increment_analysis_count', { user_id: user.id });
        } catch {
            // Non-critical, ignore if RPC doesn't exist
        }

        // usage_tracking 테이블의 analyses_used 증가 (현재 시스템)
        // ⚠️ Service Role 사용 — RLS 우회 필수 (client anon으로는 update 안 됨)
        if (!useCredit) {
            try {
                const svcClient = await createServiceClient();
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const periodStart = `${year}-${month}-01`;
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

                const { data: existingUsage } = await svcClient
                    .from('usage_tracking')
                    .select('id, analyses_used, analyses_limit')
                    .eq('user_id', user.id)
                    .eq('period_start', periodStart)
                    .maybeSingle();

                if (existingUsage) {
                    const { error: updErr } = await svcClient
                        .from('usage_tracking')
                        .update({
                            analyses_used: (existingUsage.analyses_used || 0) + 1,
                            updated_at: now.toISOString(),
                        })
                        .eq('id', existingUsage.id);
                    if (updErr) console.error('[Analyze] usage_tracking 업데이트 실패:', updErr);
                    else console.log(`[Analyze] usage 증가: ${existingUsage.analyses_used} → ${(existingUsage.analyses_used || 0) + 1} / ${existingUsage.analyses_limit}`);
                } else {
                    // 신규 row 생성 — 활성 구독 확인 후 한도 결정
                    const { data: sub } = await svcClient
                        .from('subscriptions')
                        .select('plan:subscription_plans(max_analyses)')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .maybeSingle();

                    const subPlan = (sub?.plan as { max_analyses?: number } | null);
                    const maxAnalyses = subPlan?.max_analyses ?? 5;
                    const limitValue = maxAnalyses === -1 ? 999999 : maxAnalyses;

                    const { error: insErr } = await svcClient
                        .from('usage_tracking')
                        .insert({
                            user_id: user.id,
                            period_start: periodStart,
                            period_end: periodEnd,
                            analyses_used: 1,
                            analyses_limit: limitValue,
                        });
                    if (insErr) console.error('[Analyze] usage_tracking 생성 실패:', insErr);
                    else console.log(`[Analyze] 신규 usage row 생성: limit ${limitValue}`);
                }
            } catch (err) {
                console.error('[Analyze] usage_tracking 증가 실패:', err);
            }
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
        const rawMsg = (error as Error).message || '';
        // Supabase/내부 에러는 사용자에게 노출하지 않음
        const userMsg = rawMsg.includes('did not match')
            || rawMsg.includes('violates')
            || rawMsg.includes('duplicate key')
            || rawMsg.includes('connection')
            ? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            : rawMsg;
        return NextResponse.json({
            error: `분석 중 오류가 발생했습니다: ${userMsg}`,
        }, { status: 500 });
    }
}
