// lib/insurance/product-matcher.ts
import type { AnalysisResult, ProductResult } from '@/types/analysis';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP2_PRODUCT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { generateExceptionContext } from '@/lib/insurance/exception-diseases';
import { evaluateEligibility, formatRuleEngineResultForPrompt } from '@/lib/insurance/rule-engine';

export async function matchProducts(analysisResult: AnalysisResult): Promise<ProductResult> {
    // 1. 고객의 진단 코드/이름 목록 추출
    const customerDiagnoses = extractDiagnoses(analysisResult);

    // 2. 예외질환 DB와 매칭하여 컨텍스트 생성
    const exceptionContext = generateExceptionContext(customerDiagnoses);

    // 3. 규칙 기반 사전 판단 수행
    const ruleEngineResult = evaluateEligibility(analysisResult);
    const ruleEngineContext = formatRuleEngineResultForPrompt(ruleEngineResult);

    // 4. AI 프롬프트 조립
    const prompt = STEP2_PRODUCT_PROMPT
        .replace('{ANALYSIS_RESULT}', JSON.stringify(analysisResult, null, 2))
        .replace('{EXCEPTION_DISEASE_CONTEXT}', exceptionContext)
        .replace('{RULE_ENGINE_RESULT}', ruleEngineContext);

    const response = await callOpenAI({ prompt, maxTokens: 16384 });
    return parseAIResponse<ProductResult>(response);
}

/**
 * AnalysisResult에서 고객의 진단 코드/이름 목록을 추출
 */
function extractDiagnoses(result: AnalysisResult): Array<{ code: string; name: string }> {
    const diagnoses: Array<{ code: string; name: string }> = [];
    const seen = new Set<string>();

    // items에서 추출
    if (result.items) {
        for (const item of result.items) {
            if (item.details) {
                for (const detail of item.details) {
                    const code = detail.diagnosisCode || '';
                    const name = detail.diagnosisName || '';
                    const key = `${code}|${name}`;
                    if (!seen.has(key) && (code || name)) {
                        seen.add(key);
                        diagnoses.push({ code, name });
                    }
                }
            }
        }
    }

    // diseaseSummary에서 추출
    if (result.diseaseSummary) {
        for (const disease of result.diseaseSummary) {
            const code = disease.diseaseCode || '';
            const name = disease.diseaseName || '';
            const key = `${code}|${name}`;
            if (!seen.has(key) && (code || name)) {
                seen.add(key);
                diagnoses.push({ code, name });
            }
        }
    }

    return diagnoses;
}
