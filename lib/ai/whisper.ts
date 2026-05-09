// lib/ai/whisper.ts
//
// OpenAI Whisper API 직접 호출 (음성 → 텍스트 전사).
// 보비의 다른 AI 호출(claude.ts·openai.ts)은 OpenRouter 거치지만
// Whisper는 OpenRouter 미지원이라 OpenAI 직접 호출.
//
// 환경변수:
//   OPENAI_API_KEY — Vercel ENV에 추가 필요
//
// 비용:
//   $0.006 / 분 (예: 2분 = $0.012 = 약 16원)
//
// 한계:
//   - 파일 25MB 이하 (Whisper API 제한)
//   - 한국어 자동 인식 (language: 'ko' 명시 권장)
//   - mp3·m4a·wav·webm·ogg 모두 지원

import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!_client) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. Whisper 사용 불가.');
        }
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

export interface WhisperResult {
    text: string;
    language: string; // 'ko' | 'en' | etc
    duration?: number; // 초
}

/**
 * 음성 파일 → 텍스트 전사.
 *
 * @param audioBuffer 음성 파일 버퍼 (mp3, m4a, wav, webm, ogg 등)
 * @param fileName 파일명 (확장자 자동 감지에 필요. e.g. "memo.m4a")
 * @param options.language 언어 힌트 ('ko' 권장 — 한국어 인식 정확도 ↑)
 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    fileName: string,
    options: { language?: string } = {},
): Promise<WhisperResult> {
    const client = getClient();

    // OpenAI SDK는 Node.js File-like 객체를 받음
    // Buffer + name + type 으로 가짜 File 만들기
    const audioFile = await toFile(audioBuffer, fileName);

    const response = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language || 'ko',
        response_format: 'verbose_json', // duration·language 메타 포함
    });

    // verbose_json 응답 형식
    const r = response as unknown as {
        text: string;
        language: string;
        duration?: number;
    };

    return {
        text: r.text,
        language: r.language || 'ko',
        duration: r.duration,
    };
}

// OpenAI SDK의 toFile 헬퍼
async function toFile(buffer: Buffer, name: string): Promise<File> {
    const { toFile: openaiToFile } = await import('openai/uploads');
    return await openaiToFile(buffer, name);
}
