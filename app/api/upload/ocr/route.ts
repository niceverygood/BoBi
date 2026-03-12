// app/api/upload/ocr/route.ts
// OCR endpoint: receives base64 page images, extracts text via OpenAI Vision
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structureExtractedText } from '@/lib/pdf/extractor';

export const maxDuration = 120; // OCR takes longer

type PdfFileType = 'basic_info' | 'prescription' | 'detail_treatment' | 'unknown';

function detectFileType(text: string): PdfFileType {
    const n = text.replace(/\s+/g, ' ').toLowerCase();
    if (n.includes('주상병코드') || n.includes('기본진료정보') || n.includes('진료구분')) return 'basic_info';
    if (n.includes('약품명') || n.includes('성분명') || n.includes('처방조제')) return 'prescription';
    if (n.includes('진료내역') || n.includes('세부진료') || n.includes('코드명')) return 'detail_treatment';
    return 'unknown';
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { pageImages, filePath, fileName, customerId } = await request.json();

        if (!pageImages || !Array.isArray(pageImages) || pageImages.length === 0) {
            return NextResponse.json({ error: '페이지 이미지가 없습니다.' }, { status: 400 });
        }

        // Limit to first 10 pages for OCR
        const imagesToProcess = pageImages.slice(0, 10);

        // Call OpenAI Vision API for OCR
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API 키가 설정되지 않았습니다.' }, { status: 500 });
        }

        const imageMessages = imagesToProcess.map((img: string) => ({
            type: 'image_url' as const,
            image_url: {
                url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
                detail: 'high' as const,
            },
        }));

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 한국 건강보험심평원 진료이력 문서를 읽는 OCR 전문가입니다.
이미지에서 모든 텍스트를 정확하게 추출해주세요.
특히 다음 정보를 빠짐없이 추출하세요:
- 진료시작일, 병의원명, 진단과, 입원/외래 구분
- 주상병코드, 주상병명
- 약품명, 성분명, 투약량, 투약일수
- 진료비, 급여비, 비급여비
표 형식인 경우 각 열을 | 구분자로 구분해주세요.
텍스트만 출력하세요. 부가 설명은 불필요합니다.`,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text' as const,
                                text: `이 ${imagesToProcess.length}페이지의 심평원 진료이력 PDF에서 모든 텍스트를 추출해주세요.`,
                            },
                            ...imageMessages,
                        ],
                    },
                ],
                max_tokens: 8000,
                temperature: 0,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('OpenAI Vision API error:', err);
            return NextResponse.json({
                error: `OCR 처리 실패: ${err.error?.message || '알 수 없는 오류'}`,
            }, { status: 500 });
        }

        const aiResult = await response.json();
        const extractedText = aiResult.choices?.[0]?.message?.content || '';

        if (!extractedText.trim()) {
            return NextResponse.json({
                error: '이미지에서 텍스트를 추출할 수 없었습니다.',
            }, { status: 400 });
        }

        // Detect file type and structure text
        const fileType = detectFileType(extractedText);
        const structuredText = structureExtractedText(extractedText, fileType);

        // Save upload record
        const { data: upload, error: dbError } = await supabase
            .from('uploads')
            .insert({
                user_id: user.id,
                customer_id: customerId || null,
                file_name: fileName || 'ocr_scan.pdf',
                file_path: filePath || `${user.id}/ocr_${Date.now()}.pdf`,
                file_type: fileType === 'unknown' ? 'basic_info' : fileType,
                raw_text: structuredText,
            })
            .select()
            .single();

        if (dbError) {
            console.error('DB insert error:', dbError);
            return NextResponse.json({ error: '업로드 기록 저장에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            upload,
            fileType,
            pageCount: imagesToProcess.length,
            textPreview: structuredText.substring(0, 500),
            ocrUsed: true,
        });
    } catch (error) {
        console.error('OCR error:', error);
        return NextResponse.json({
            error: `OCR 처리 중 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
