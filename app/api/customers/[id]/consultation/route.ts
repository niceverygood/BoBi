// app/api/customers/[id]/consultation/route.ts
//
// 고객 상담 음성 메모 — 업로드 + 전사 + AI 요약 + 저장.
//
// POST: 음성 파일 업로드 → 처리 → consultation_memos INSERT
// GET:  특정 고객의 메모 목록 (최신순)
//
// 흐름:
//   1) 사용자가 음성 파일 업로드 (m4a / mp3 / wav / webm)
//   2) Whisper STT → 전사 텍스트
//   3) Claude 분석 → 요약·다음 액션·태그·감정
//   4) consultation_memos INSERT
//
// ⚠️ 통화 녹음은 양 당사자 동의 필수 (통신비밀보호법).
//    보비는 도구일 뿐, 동의 확보는 사용자 책임.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/whisper';
import { callClaude } from '@/lib/ai/claude';

interface AnalyzedMemo {
    summary: string;
    next_actions: Array<{
        action: string;
        due_date?: string | null;  // YYYY-MM-DD 또는 'tomorrow' / 'next_week' 등 자유 문자열
        priority?: 'high' | 'medium' | 'low';
    }>;
    tags: string[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { id: customerId } = await params;

        // 고객 소유권 확인
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

        // 폼에서 음성 파일 + 메타 받기
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const occurredAt = formData.get('occurred_at') as string | null;
        const manualTranscript = formData.get('transcript') as string | null;

        // 옵션 1: 음성 파일 업로드
        let transcript: string;
        let language = 'ko';
        let duration: number | undefined;
        let audioPath: string | null = null;

        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                return NextResponse.json({
                    error: '음성 파일은 25MB 이하여야 합니다 (Whisper API 제한).',
                }, { status: 400 });
            }
            const allowed = ['audio/', 'video/'];  // video/webm 등도 허용
            if (!allowed.some((p) => file.type.startsWith(p))) {
                return NextResponse.json({
                    error: '음성 파일(mp3·m4a·wav·webm)만 업로드 가능합니다.',
                }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());

            // Supabase Storage 업로드 (선택, 실패해도 흐름은 계속)
            const ext = (file.name.split('.').pop() || 'm4a').toLowerCase();
            audioPath = `consultations/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            try {
                await supabase.storage.from('consultations').upload(audioPath, buffer, {
                    contentType: file.type,
                    upsert: false,
                });
            } catch (storageErr) {
                console.warn('[consultation] storage upload failed:', (storageErr as Error).message);
                audioPath = null;  // 저장 실패해도 분석은 계속
            }

            // Whisper STT
            try {
                const result = await transcribeAudio(buffer, file.name, { language: 'ko' });
                transcript = result.text;
                language = result.language;
                duration = result.duration;
            } catch (err) {
                const msg = (err as Error).message;
                console.error('[consultation] whisper error:', msg);
                return NextResponse.json({
                    error: msg.includes('OPENAI_API_KEY')
                        ? '음성 분석 기능이 아직 활성화되지 않았습니다. 관리자에게 문의해주세요.'
                        : `음성 전사 실패: ${msg}`,
                }, { status: 500 });
            }
        } else if (manualTranscript) {
            // 옵션 2: 수동 전사 텍스트 직접 입력 (음성 파일 없이도 가능)
            transcript = manualTranscript;
            duration = undefined;
        } else {
            return NextResponse.json({
                error: '음성 파일 또는 메모 텍스트를 첨부해주세요.',
            }, { status: 400 });
        }

        if (!transcript || transcript.trim().length < 5) {
            return NextResponse.json({
                error: '전사 결과가 너무 짧습니다. 다시 시도해주세요.',
            }, { status: 400 });
        }

        // Claude 분석 — 요약·다음 액션·태그·감정
        const today = new Date().toISOString().slice(0, 10);
        const prompt = `다음은 보험 설계사가 고객(${customer.name})과 통화·미팅 후 작성한 메모(또는 음성 전사)입니다.
이 내용을 분석해 JSON으로 정리해주세요.

오늘 날짜: ${today} (KST)
고객명: ${customer.name}

추출할 항목:
- summary: 통화·미팅 핵심 요약 (1~3 문장, 한국어)
- next_actions: 다음 액션 배열. 각 항목은:
    - action: 구체 행동 (예: "내일 오후 2시 재통화", "보장 비교 자료 카톡 발송")
    - due_date: YYYY-MM-DD 형식 또는 null (모르면 null)
    - priority: "high" | "medium" | "low"
  ※ 액션이 없으면 빈 배열 [].
- tags: 키워드 태그 배열 (3~6개). 보험 영업 관점.
  예시: ["갱신문의", "암보험관심", "거절의사", "가족보험검토", "보험금청구"]
- sentiment: 전반적 분위기. "positive" | "neutral" | "negative" | "mixed"

⚠️ 주의:
- 전사가 부정확할 수 있으니 추측 금지 (모호하면 summary에 "확인 필요" 명시)
- next_actions의 due_date는 메모에 명시된 날짜만 추출 (없으면 null)
- 개인 사생활 정보(주민번호·계좌번호 등)는 summary에 포함하지 말 것
- "확실히", "100%" 같은 단정 표현 금지

JSON만 출력. 마크다운·설명 없이.

메모 내용:
─────────
${transcript}
─────────`;

        let analyzed: AnalyzedMemo;
        try {
            const raw = await callClaude({ prompt, maxTokens: 1024, temperature: 0.2 });
            const cleaned = raw
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();
            analyzed = JSON.parse(cleaned);
        } catch (err) {
            console.error('[consultation] claude error:', err);
            // 분석 실패해도 전사 결과는 저장
            analyzed = {
                summary: transcript.slice(0, 200) + (transcript.length > 200 ? '...' : ''),
                next_actions: [],
                tags: [],
                sentiment: 'neutral',
            };
        }

        // INSERT
        const { data: inserted, error: insertErr } = await supabase
            .from('consultation_memos')
            .insert({
                customer_id: customerId,
                user_id: user.id,
                audio_path: audioPath,
                audio_duration_seconds: duration ? Math.round(duration) : null,
                transcript,
                transcript_language: language,
                summary: analyzed.summary,
                next_actions: analyzed.next_actions,
                tags: analyzed.tags,
                sentiment: analyzed.sentiment,
                occurred_at: occurredAt || new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error('[consultation] insert error:', insertErr);
            return NextResponse.json({ error: 'DB 저장 실패: ' + insertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            memo: inserted,
        });
    } catch (error) {
        console.error('[consultation] Unhandled error:', error);
        return NextResponse.json({
            error: (error as Error).message || '서버 오류',
        }, { status: 500 });
    }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { id: customerId } = await params;

        // 고객 소유권 확인
        const { data: customer } = await supabase
            .from('customers')
            .select('user_id')
            .eq('id', customerId)
            .single();
        if (!customer || customer.user_id !== user.id) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const { data: memos, error: memosErr } = await supabase
            .from('consultation_memos')
            .select('id, summary, next_actions, tags, sentiment, transcript, audio_duration_seconds, occurred_at, created_at')
            .eq('customer_id', customerId)
            .order('occurred_at', { ascending: false })
            .limit(50);

        if (memosErr) {
            return NextResponse.json({ error: memosErr.message }, { status: 500 });
        }

        return NextResponse.json({ memos: memos || [] });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message || '서버 오류' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const url = new URL(request.url);
        const memoId = url.searchParams.get('memo_id');
        if (!memoId) {
            return NextResponse.json({ error: 'memo_id 누락' }, { status: 400 });
        }

        const { id: customerId } = await params;

        // RLS 의존: user_id 본인 메모만 삭제됨
        const { error: delErr } = await supabase
            .from('consultation_memos')
            .delete()
            .eq('id', memoId)
            .eq('customer_id', customerId)
            .eq('user_id', user.id);

        if (delErr) {
            return NextResponse.json({ error: delErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message || '서버 오류' }, { status: 500 });
    }
}
