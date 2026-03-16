// lib/ai/openai.ts
// OpenRouter API를 통해 Claude Opus 4.6 사용
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
}

export async function callOpenAI({
    prompt,
    maxTokens = 4096,
    temperature = 0.1,
    retries = 2,
}: OpenAIRequestOptions): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await getClient().chat.completions.create({
                model: 'anthropic/claude-sonnet-4.5',
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 한국 보험 전문 AI입니다. 반드시 유효한 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 절대 포함하지 마세요. 마크다운 코드블록도 사용하지 마세요.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const content = response.choices[0]?.message?.content;
            if (content) {
                return content;
            }

            throw new Error('Unexpected response format from OpenRouter API');
        } catch (error) {
            lastError = error as Error;
            console.error(`OpenRouter API attempt ${attempt + 1} failed:`, error);

            // Don't retry on rate limit (429) or auth errors
            const errorMessage = (error as Error).message || '';
            if (errorMessage.includes('429') || errorMessage.includes('401')) {
                break;
            }

            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    throw new Error(`OpenRouter API failed after ${retries + 1} attempts: ${lastError?.message}`);
}
