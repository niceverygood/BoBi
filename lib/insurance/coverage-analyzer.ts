// lib/insurance/coverage-analyzer.ts
import type { CoverageInput, CoverageAnalysisResult } from '@/types/coverage';
import { callOpenAI } from '@/lib/ai/openai';
import { COVERAGE_ANALYSIS_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';

export async function analyzeCoverage(input: CoverageInput): Promise<CoverageAnalysisResult> {
    const prompt = COVERAGE_ANALYSIS_PROMPT
        .replace('{POLICY_DATA}', JSON.stringify(input, null, 2));

    const response = await callOpenAI({ prompt, maxTokens: 8000, retries: 1 });
    return parseAIResponse<CoverageAnalysisResult>(response);
}
