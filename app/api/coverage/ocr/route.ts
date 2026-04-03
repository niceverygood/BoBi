// app/api/coverage/ocr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseAIResponse } from '@/lib/ai/parser';
import type { Policy } from '@/types/coverage';

export const maxDuration = 300;

const OCR_PROMPT = `
당신은 보험 증권(보험증서) 이미지를 분석하는 AI입니다.

## 역할
보험 증권 이미지에서 보험 계약 정보와 보장 내역을 정확하게 추출합니다.

## 추출 규칙
1. 보험회사명, 상품명, 계약일, 만기일, 월 보험료를 찾으세요
2. 보장 항목(특약) 목록에서 보장명, 보장금액을 추출하세요
3. 보장금액은 순수 숫자(원 단위)로 변환하세요 (예: "3,000만원" → 30000000)
4. 갱신/비갱신 여부를 판단하세요
5. 읽을 수 없는 항목은 빈 문자열로 남기세요

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요.

{
  "policies": [
    {
      "insurer": "보험회사",
      "product_name": "상품명",
      "contract_date": "YYYY-MM-DD",
      "expiry_date": "YYYY-MM-DD",
      "monthly_premium": 월보험료숫자,
      "status": "유지",
      "renewal_type": "비갱신|갱신",
      "coverages": [
        {
          "coverage_name": "보장명",
          "coverage_amount": 보장금액숫자,
          "coverage_type": "진단|일당|수술|사망|실손|배상|후유장해|기타",
          "category": "암|뇌혈관|심장|사망|입원|수술|통원|실손|후유장해|배상책임|기타"
        }
      ]
    }
  ]
}
`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const formData = await request.formData();
        const images = formData.getAll('images') as File[];

        if (!images || images.length === 0) {
            return NextResponse.json({ error: '이미지를 업로드해주세요.' }, { status: 400 });
        }

        // Convert images to base64
        const imageContents: Array<{ type: 'image_url'; image_url: { url: string } }> = [];
        for (const image of images) {
            const buffer = Buffer.from(await image.arrayBuffer());
            const base64 = buffer.toString('base64');
            const mimeType = image.type || 'image/jpeg';
            imageContents.push({
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
            });
        }

        // Call OpenRouter with vision
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            defaultHeaders: {
                'HTTP-Referer': 'https://bo-bi.vercel.app',
                'X-Title': 'BoBi AI Insurance Assistant',
            },
        });

        const response = await client.chat.completions.create({
            model: 'anthropic/claude-sonnet-4.5',
            max_tokens: 8192,
            temperature: 0.1,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: OCR_PROMPT },
                        ...imageContents,
                    ],
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('AI 응답이 비어있습니다.');
        }

        const result = parseAIResponse<{ policies: Policy[] }>(content);

        return NextResponse.json({ policies: result.policies });
    } catch (error) {
        console.error('OCR error:', error);
        return NextResponse.json({
            error: `OCR 처리 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
