// lib/ai/openai.ts
// OpenRouter API를 통해 Claude 사용
import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!_client) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.');
        }
        _client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey,
            defaultHeaders: {
                'HTTP-Referer': 'https://bo-bi.vercel.app',
                'X-Title': 'BoBi AI Insurance Assistant',
            },
        });
    }
    return _client;
}

interface OpenAIRequestOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    retries?: number;
    systemMessage?: string;
    /** 빠른 모델 사용 (챗봇, 간단한 분석용) */
    fast?: boolean;
}

export async function callOpenAI({
    prompt,
    maxTokens = 4096,
    temperature = 0.1,
    retries = 1,
    systemMessage,
    fast = false,
}: OpenAIRequestOptions): Promise<string> {
    let lastError: Error | null = null;
    const model = fast ? 'anthropic/claude-3.5-haiku' : 'anthropic/claude-sonnet-4.5';
    const timeout = fast ? 30000 : 60000;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await getClient().chat.completions.create(
                {
                    model,
                    max_tokens: maxTokens,
                    temperature,
                    messages: [
                        {
                            role: 'system',
                            content: systemMessage || '당신은 한국 보험 전문 AI입니다. 반드시 유효한 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 절대 포함하지 마세요. 마크다운 코드블록도 사용하지 마세요.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                },
                { timeout },
            );

            const content = response.choices[0]?.message?.content;
            if (content) return content;

            throw new Error('Empty response from AI');
        } catch (error) {
            lastError = error as Error;
            const errorMessage = (error as Error).message || '';
            console.error(`AI attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage.substring(0, 200));

            // 인증 에러는 재시도 안 함
            if (errorMessage.includes('401') || errorMessage.includes('403')) break;

            // 재시도 대기 (짧게)
            if (attempt < retries) {
                const waitMs = errorMessage.includes('429') ? 2000 : 1000;
                await new Promise(r => setTimeout(r, waitMs));
            }
        }
    }

    const msg = lastError?.message || '';
    if (msg.includes('429')) throw new Error('AI 서비스가 현재 사용량이 많습니다. 잠시 후 다시 시도해주세요.');
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) throw new Error('AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    if (msg.includes('401') || msg.includes('403')) throw new Error('AI 서비스 인증 오류입니다. 관리자에게 문의해주세요.');
    throw new Error(`AI 분석에 실패했습니다. (${msg.substring(0, 100)})`);
}
