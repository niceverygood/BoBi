// lib/ai/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

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
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
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
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (content) {
                return content;
            }

            throw new Error('Unexpected response format from OpenAI API');
        } catch (error) {
            lastError = error as Error;
            console.error(`OpenAI API attempt ${attempt + 1} failed:`, error);

            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    throw new Error(`OpenAI API failed after ${retries + 1} attempts: ${lastError?.message}`);
}
