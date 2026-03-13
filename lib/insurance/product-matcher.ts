// lib/insurance/product-matcher.ts
import type { AnalysisResult, ProductResult } from '@/types/analysis';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP2_PRODUCT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { generateExceptionContext } from '@/lib/insurance/exception-diseases';

export async function matchProducts(analysisResult: AnalysisResult): Promise<ProductResult> {
    // 고객의 진단 코드/이름 목록 추출
    const customerDiagnoses = extractDiagnoses(analysisResult);

    // 예외질환 DB와 매칭하여 컨텍스트 생성
    const exceptionContext = generateExceptionContext(customerDiagnoses);

    const prompt = STEP2_PRODUCT_PROMPT
        .replace('{ANALYSIS_RESULT}', JSON.stringify(analysisResult, null, 2))
        .replace('{EXCEPTION_DISEASE_CONTEXT}', exceptionContext);

    const response = await callOpenAI({ prompt, maxTokens: 4096 });
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
