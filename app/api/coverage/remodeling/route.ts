// app/api/coverage/remodeling/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';
import { REMODELING_PROPOSAL_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import type { CoverageAnalysisResult, CoverageInput, RemodelingProposal } from '@/types/coverage';

export const maxDuration = 300;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body: {
            coverageResult: CoverageAnalysisResult;
            inputData: CoverageInput;
        } = await request.json();

        if (!body.coverageResult || !body.inputData) {
            return NextResponse.json({ error: '보장 분석 결과와 보험 내역이 필요합니다.' }, { status: 400 });
        }

        // Build the prompt
        const prompt = REMODELING_PROPOSAL_PROMPT
            .replace('{COVERAGE_RESULT}', JSON.stringify(body.coverageResult, null, 2))
            .replace('{POLICY_DATA}', JSON.stringify(body.inputData, null, 2));

        const response = await callOpenAI({ prompt, maxTokens: 8000, retries: 1 });
        const proposal = parseAIResponse<RemodelingProposal>(response);

        return NextResponse.json({ proposal });
    } catch (error) {
        console.error('Remodeling proposal error:', error);
        return NextResponse.json({
            error: `리모델링 제안서 생성 중 오류가 발생했습니다: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
