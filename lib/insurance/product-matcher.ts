// lib/insurance/product-matcher.ts
import type { AnalysisResult, ProductResult } from '@/types/analysis';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP2_PRODUCT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';

export async function matchProducts(analysisResult: AnalysisResult): Promise<ProductResult> {
    const prompt = STEP2_PRODUCT_PROMPT.replace(
        '{ANALYSIS_RESULT}',
        JSON.stringify(analysisResult, null, 2)
    );

    const response = await callOpenAI({ prompt, maxTokens: 4096 });
    return parseAIResponse<ProductResult>(response);
}
