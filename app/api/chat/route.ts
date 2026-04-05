// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI } from '@/lib/ai/openai';

export const maxDuration = 60;

const SYSTEM_PROMPT = `당신은 "보비(BoBi)"의 AI 상담 어시스턴트입니다.
보비는 보험설계사를 위한 AI 보험비서 서비스입니다.

## 보비 서비스 안내
- 심평원 진료이력 PDF 업로드 → AI 고지사항 자동 분석
- 가입가능 상품 자동 판단 (간편심사/유병자/표준체)
- 질병 위험도 리포트 (의학 통계 기반 연관 질환 분석)
- 가상 사고 영수증 (질병 시 예상 비용 시뮬레이션)
- 보험금 청구 가능여부 안내

## 요금제
- 무료: 월 5건 분석
- 베이직: 월 19,900원 / 30건 분석 + 보장 분석 리포트
- 프로: 월 39,900원 / 200건 분석 + 리모델링 제안서
- 팀 베이직: 월 79,000원 / 팀원당 50건
- 팀 프로: 월 149,000원 / 무제한

## 규칙
- 한국어로 답변
- 보비 서비스 관련 질문에 친절하고 간결하게 답변
- 보험 상품 직접 추천/판매 행위 금지
- 의학적 진단이나 법률 자문 금지
- 모르는 질문은 "상담사 연결을 눌러주시면 담당자가 안내해드리겠습니다"로 안내
- 2~3문장으로 간결하게 답변
`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { message, history } = await request.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
        }

        // 최근 대화 히스토리 (최대 10개)
        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...(history || []).slice(-10).map((h: { role: string; content: string }) => ({
                role: h.role as 'user' | 'assistant',
                content: h.content,
            })),
            { role: 'user' as const, content: message },
        ];

        // Claude API 호출 — 시스템 메시지는 별도로 전달, 대화만 프롬프트로
        const prompt = messages
            .filter(m => m.role !== 'system')
            .map(m => m.role === 'user' ? `사용자: ${m.content}` : `어시스턴트: ${m.content}`)
            .join('\n\n');

        const reply = await callOpenAI({
            prompt,
            maxTokens: 500,
            retries: 1,
            systemMessage: SYSTEM_PROMPT,
            fast: true,
        });

        return NextResponse.json({ reply: reply.trim() });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({
            error: '응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
        }, { status: 500 });
    }
}
