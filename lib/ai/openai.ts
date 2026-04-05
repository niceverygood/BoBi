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
    /** 시스템 메시지 오버라이드 (기본: JSON 응답 지시) */
    systemMessage?: string;
}

export async function callOpenAI({
    prompt,
    maxTokens = 4096,
    temperature = 0.1,
    retries = 3,
    systemMessage,
}: OpenAIRequestOptions): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await getClient().chat.completions.create(
                {
                    model: 'anthropic/claude-sonnet-4.5',
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
                {
                    timeout: 90000, // 90 second timeout per request
                },
            );

            const content = response.choices[0]?.message?.content;
            if (content) {
                return content;
            }

            throw new Error('Unexpected response format from OpenRouter API');
        } catch (error) {
            lastError = error as Error;
            const errorMessage = (error as Error).message || '';

            // Log each attempt
            console.error(`OpenRouter API attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage.substring(0, 200));

            // Don't retry on auth errors
            if (errorMessage.includes('401') || errorMessage.includes('403')) {
                break;
            }

            // On rate limit, wait longer before retry
            if (errorMessage.includes('429') || errorMessage.includes('rate')) {
                if (attempt < retries) {
                    const waitMs = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s
                    console.log(`Rate limited. Waiting ${waitMs}ms before retry...`);
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                    continue;
                }
                break;
            }

            // On server overloaded (502/503), retry with backoff
            if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
                if (attempt < retries) {
                    const waitMs = 2000 * Math.pow(2, attempt);
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                    continue;
                }
                break;
            }

            // General retry with exponential backoff
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1500 * Math.pow(2, attempt)));
            }
        }
    }

    // Provide user-friendly error messages
    const msg = lastError?.message || '';
    if (msg.includes('429') || msg.includes('rate')) {
        throw new Error('AI 서비스가 현재 사용량이 많습니다. 잠시 후 다시 시도해주세요.');
    }
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
        throw new Error('AI 응답 시간이 초과되었습니다. 파일 크기가 큰 경우 잠시 후 다시 시도해주세요.');
    }
    if (msg.includes('401') || msg.includes('403')) {
        throw new Error('AI 서비스 인증 오류입니다. 관리자에게 문의해주세요.');
    }
    throw new Error(`AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요. (${msg.substring(0, 100)})`);
}
