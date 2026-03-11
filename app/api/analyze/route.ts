// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';
import { STEP1_ANALYSIS_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse, validateAnalysisResult } from '@/lib/ai/parser';
import type { AnalysisResult } from '@/types/analysis';

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

        if (profile) {
            const limits: Record<string, number> = { basic: 50, pro: 200, enterprise: Infinity };
            const limit = limits[profile.plan] || 50;
            if (profile.analysis_count >= limit) {
                return NextResponse.json({ error: '이번 달 분석 한도를 초과했습니다. 플랜을 업그레이드해주세요.' }, { status: 429 });
            }
        }

        const { customerId, uploadIds } = await request.json();

        if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
            return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
        }

        // Get uploaded texts
        const { data: uploads, error: uploadError } = await supabase
            .from('uploads')
            .select('*')
            .in('id', uploadIds)
            .eq('user_id', user.id);

        if (uploadError || !uploads || uploads.length === 0) {
            return NextResponse.json({ error: '업로드된 파일을 찾을 수 없습니다.' }, { status: 404 });
        }

        // Combine texts
        const combinedText = uploads
            .map((u) => u.raw_text || '')
            .filter(Boolean)
            .join('\n\n---\n\n');

        if (!combinedText.trim()) {
            return NextResponse.json({ error: 'PDF에서 텍스트를 추출할 수 없었습니다.' }, { status: 400 });
        }

        // Create analysis record
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .insert({
                user_id: user.id,
                customer_id: customerId || null,
                upload_ids: uploadIds,
                status: 'processing',
            })
            .select()
            .single();

        if (analysisError || !analysis) {
            return NextResponse.json({ error: '분석 기록 생성에 실패했습니다.' }, { status: 500 });
        }

        // Call Claude AI
        const prompt = STEP1_ANALYSIS_PROMPT.replace('{PDF_TEXT}', combinedText);
        const aiResponse = await callClaude({ prompt, maxTokens: 4096 });
        const result = parseAIResponse<AnalysisResult>(aiResponse);

        if (!validateAnalysisResult(result as unknown as Record<string, unknown>)) {
            throw new Error('AI 분석 결과 형식이 올바르지 않습니다.');
        }

        // Update analysis with results
        const { error: updateError } = await supabase
            .from('analyses')
            .update({
                status: 'completed',
                medical_history: result as unknown as Record<string, unknown>,
                disclosure_summary: {
                    items: result.items,
                    riskFlags: result.riskFlags,
                    overallSummary: result.overallSummary,
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
