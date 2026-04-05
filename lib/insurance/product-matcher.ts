// lib/insurance/product-matcher.ts
import type { AnalysisResult, ProductResult } from '@/types/analysis';
import { callOpenAI } from '@/lib/ai/openai';
import { STEP2_PRODUCT_PROMPT } from '@/lib/ai/prompts';
import { parseAIResponse } from '@/lib/ai/parser';
import { generateExceptionContext } from '@/lib/insurance/exception-diseases';
import { evaluateEligibility, formatRuleEngineResultForPrompt } from '@/lib/insurance/rule-engine';
import { lookupKcd } from '@/lib/kcd/lookup';

export async function matchProducts(analysisResult: AnalysisResult): Promise<ProductResult> {
    // 1. 고객의 진단 코드/이름 목록 추출 + KCD DB로 정확한 질병명 보강
    const customerDiagnoses = extractDiagnoses(analysisResult);
    const enrichedDiagnoses = enrichWithKcd(customerDiagnoses);

    // 2. 예외질환 DB와 매칭하여 컨텍스트 생성 (enriched 진단 사용)
    const exceptionContext = generateExceptionContext(enrichedDiagnoses);

    // 3. 규칙 기반 사전 판단 수행
    const ruleEngineResult = evaluateEligibility(analysisResult);
    const ruleEngineContext = formatRuleEngineResultForPrompt(ruleEngineResult);

    // 4. KCD 질병명 매핑 컨텍스트 생성 (AI에게 정확한 질병명 제공)
    const kcdMappingContext = generateKcdMappingContext(enrichedDiagnoses);

    // 5. AI 프롬프트 조립
    const prompt = STEP2_PRODUCT_PROMPT
        .replace('{ANALYSIS_RESULT}', JSON.stringify(analysisResult, null, 2))
        .replace('{EXCEPTION_DISEASE_CONTEXT}', exceptionContext)
        .replace('{RULE_ENGINE_RESULT}', ruleEngineContext + '\n' + kcdMappingContext);

    const response = await callOpenAI({ prompt, maxTokens: 8000, retries: 1 });
    return parseAIResponse<ProductResult>(response);
}

/**
 * KCD DB에서 정확한 질병명/신체부위 보강
 */
function enrichWithKcd(
    diagnoses: Array<{ code: string; name: string }>
): Array<{ code: string; name: string }> {
    return diagnoses.map(d => {
        if (!d.code) return d;
        const kcdInfo = lookupKcd(d.code);
        if (kcdInfo && kcdInfo.name) {
            // KCD DB의 정확한 질병명으로 보강 (기존 이름이 없거나 다를 경우)
            return {
                code: d.code,
                name: kcdInfo.name,
            };
        }
        return d;
    });
}

/**
 * AI에게 전달할 KCD 질병명 매핑 테이블 생성
 */
function generateKcdMappingContext(
    diagnoses: Array<{ code: string; name: string }>
): string {
    if (diagnoses.length === 0) return '';

    let context = `\n## 📖 고객 진단코드 KCD 정확 질병명 (건강보험심사평가원 DB 기반)\n\n`;
    context += `아래는 고객의 진단코드를 건강보험심사평가원 KCD DB에서 정확히 조회한 결과입니다.\n`;
    context += `판단 시 이 정확한 질병명을 사용하세요.\n\n`;

    for (const d of diagnoses) {
        const kcdInfo = lookupKcd(d.code);
        if (kcdInfo) {
            context += `- **${d.code}**: ${kcdInfo.name}`;
            if (kcdInfo.bodyPart) context += ` [${kcdInfo.bodyPart}]`;
            if (kcdInfo.categoryName) context += ` (${kcdInfo.categoryName})`;
            context += `\n`;
        } else {
            context += `- **${d.code}**: ${d.name} (KCD DB 미등록)\n`;
        }
    }

    return context;
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
