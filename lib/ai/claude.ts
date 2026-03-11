// lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ClaudeRequestOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    retries?: number;
}

export async function callClaude({
    prompt,
    maxTokens = 4096,
    temperature = 0.1,
    retries = 2,
}: ClaudeRequestOptions): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                system: '당신은 한국 보험 전문 AI입니다. 반드시 유효한 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 절대 포함하지 마세요. 마크다운 코드블록도 사용하지 마세요.',
            });

            const content = message.content[0];
            if (content.type === 'text') {
                return content.text;
            }

            throw new Error('Unexpected response format from Claude API');
        } catch (error) {
            lastError = error as Error;
            console.error(`Claude API attempt ${attempt + 1} failed:`, error);

            if (attempt < retries) {
                // Wait before retrying (exponential backoff)
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    throw new Error(`Claude API failed after ${retries + 1} attempts: ${lastError?.message}`);
}
