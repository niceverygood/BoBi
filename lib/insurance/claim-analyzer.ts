// lib/insurance/claim-analyzer.ts
import type { ClaimResult } from '@/types/analysis';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP3_CLAIMS_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';

export async function analyzeClaims(
    medicalHistory: string,
    insuranceClauses: string
): Promise<ClaimResult> {
    const prompt = STEP3_CLAIMS_PROMPT
        .replace('{MEDICAL_HISTORY}', medicalHistory)
        .replace('{INSURANCE_CLAUSES}', insuranceClauses);

    const response = await callOpenAI({ prompt, maxTokens: 8000, retries: 1 });
    return parseAIResponse<ClaimResult>(response);
}
