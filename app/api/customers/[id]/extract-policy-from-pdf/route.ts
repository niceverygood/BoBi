// app/api/customers/[id]/extract-policy-from-pdf/route.ts
//
// 가입 제안서 / 청약서 PDF를 받아 AI(Claude)로 보험 정보 추출.
// CRM Phase A의 customers 컬럼(insurer·product_name·enrollment_date·
// exemption_end_date·reduction_end_date·renewal_date·policy_memo)을
// AI가 자동으로 채워주는 결과 반환.
//
// ⚠️ 본 라우트는 추출만 한다. DB 저장 X.
//    클라이언트가 검수 후 PATCH /api/customers/[id] 로 별도 저장.
//    (AI 환각 방어 + 사용자 검수 권한 보장)

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractPdfText } from '@/lib/pdf/extractor';
import { callClaude } from '@/lib/ai/claude';

interface ExtractedPolicy {
    insurer?: string | null;             // 보험사 (예: 삼성화재)
    product_name?: string | null;        // 상품명 (예: 실손의료보험)
    enrollment_date?: string | null;     // 가입일 (YYYY-MM-DD)
    exemption_end_date?: string | null;  // 90일 면책 종료일 (YYYY-MM-DD)
    reduction_end_date?: string | null;  // 1년 감액 종료일 (YYYY-MM-DD)
    renewal_date?: string | null;        // 갱신일 (YYYY-MM-DD)
    policy_memo?: string | null;         // 보장사항 요약 (자유 텍스트)
    confidence?: 'high' | 'medium' | 'low'; // AI 자체 신뢰도
    notes?: string | null;               // AI가 사용자에게 전달할 특이사항
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { id: customerId } = await params;

        // 고객 소유권 확인 (다른 사용자 고객 PDF 분석 차단)
        const { data: customer, error: cErr } = await supabase
            .from('customers')
            .select('id, user_id, name')
            .eq('id', customerId)
            .single();
        if (cErr || !customer) {
            return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
        }
        if (customer.user_id !== user.id) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        // 멀티파트 폼에서 PDF 받기
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'PDF 파일을 첨부해주세요.' }, { status: 400 });
        }
        if (!file.type.includes('pdf')) {
            return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다.' }, { status: 400 });
        }
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: 'PDF 크기는 20MB 이하여야 합니다.' }, { status: 400 });
        }

        // PDF 텍스트 추출
        const buffer = Buffer.from(await file.arrayBuffer());
        let pdfText: string;
        try {
            const extracted = await extractPdfText(buffer);
            pdfText = extracted.text;
        } catch (err) {
            const msg = (err as Error).message;
            if (msg === 'OCR_NEEDED') {
                return NextResponse.json({
                    error: '이미지로 된 PDF는 현재 지원되지 않습니다. 텍스트가 포함된 PDF로 업로드해주세요.',
                }, { status: 400 });
            }
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        // 텍스트 길이 제한 (Claude 입력 토큰 보호)
        const MAX_CHARS = 30000;
        const truncated = pdfText.length > MAX_CHARS
            ? pdfText.slice(0, MAX_CHARS) + '\n\n... (이후 내용 생략)'
            : pdfText;

        // Claude에 추출 요청
        const today = new Date().toISOString().slice(0, 10);
        const prompt = `다음은 한국 보험 가입 제안서 또는 청약서 PDF에서 추출한 텍스트입니다.
이 문서를 분석해 보험 정보를 JSON으로 추출해주세요.

오늘 날짜: ${today} (KST)

추출할 항목:
- insurer:            보험사명 (예: "삼성화재", "현대해상", "한화생명"). 모르면 null.
- product_name:       상품명 (예: "실손의료보험", "암보험"). 모르면 null.
- enrollment_date:    가입일 (계약일·청약일·시작일). YYYY-MM-DD 형식. 모르면 null.
- exemption_end_date: 90일 면책 기간 종료일. enrollment_date 기준 +90일.
                      문서에 명시되어 있으면 그 날짜, 없으면 enrollment_date+90일로 계산.
                      모르면 null.
- reduction_end_date: 감액 기간 종료일. 보통 1년 (enrollment_date +365일).
                      종신·암 등 일부 상품은 감액 기간 없음 → null.
                      문서에 명시 있으면 그 날짜, 없고 감액 기간 있으면 +1년 계산.
- renewal_date:       갱신일·만기일·다음 갱신일. YYYY-MM-DD. 모르면 null.
- policy_memo:        보장사항·주요 특약을 2~4줄로 요약 (한국어). 핵심 보장 항목 + 보장 금액.
                      예: "암 진단비 5,000만원 / 입원 일당 3만원 / 수술비 200만원".
- confidence:         "high" (날짜·금액 모두 명확) | "medium" (일부 불확실) | "low" (대부분 추정)
- notes:              사용자에게 알려야 할 특이사항 1줄. 예:
                      "면책·감액 기간이 문서에 명시 안 됨, 가입일 기준 자동 계산함"
                      "자동차보험이라 면책·감액 개념이 적용되지 않음"
                      "외화 보험 금액은 환산하지 않음"
                      특이사항 없으면 null.

⚠️ 중요:
- 한국 보험 약관 표준 용어 사용
- 날짜는 반드시 YYYY-MM-DD 형식
- 추측하지 말고 모르는 항목은 null
- 외화·환산·복잡 계산은 하지 말 것 (notes에 명시)

JSON만 출력. 마크다운·설명 없이.

PDF 텍스트:
─────────
${truncated}
─────────`;

        let raw: string;
        try {
            raw = await callClaude({ prompt, maxTokens: 1024, temperature: 0 });
        } catch (err) {
            console.error('[extract-policy] Claude error:', err);
            return NextResponse.json({
                error: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            }, { status: 500 });
        }

        // JSON 파싱 (Claude가 가끔 ```json ... ``` 으로 감쌀 때 방어)
        let parsed: ExtractedPolicy;
        try {
            const cleaned = raw
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();
            parsed = JSON.parse(cleaned);
        } catch (err) {
            console.error('[extract-policy] JSON parse error:', err, 'raw:', raw);
            return NextResponse.json({
                error: 'AI 응답 형식 오류. 다시 시도해주세요.',
                debug: process.env.NODE_ENV === 'development' ? raw : undefined,
            }, { status: 500 });
        }

        // 날짜 형식 검증 (잘못된 형식이면 null로)
        const dateFields: (keyof ExtractedPolicy)[] = [
            'enrollment_date', 'exemption_end_date', 'reduction_end_date', 'renewal_date',
        ];
        for (const f of dateFields) {
            const v = parsed[f];
            if (v && typeof v === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                console.warn(`[extract-policy] invalid date in ${f}: ${v}, set to null`);
                (parsed as Record<string, unknown>)[f] = null;
            }
        }

        return NextResponse.json({
            success: true,
            extracted: parsed,
            // 디버그용: 사용자가 결과 이상하면 PDF 텍스트 일부 확인 가능
            previewText: truncated.slice(0, 500),
        });
    } catch (error) {
        console.error('[extract-policy] Unhandled error:', error);
        return NextResponse.json({
            error: (error as Error).message || '서버 오류',
        }, { status: 500 });
    }
}
