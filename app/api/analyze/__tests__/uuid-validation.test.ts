import { describe, it, expect } from 'vitest';

// UUID 검증 로직을 단독 테스트 — route.ts에서 사용하는 것과 동일한 정규식
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filterValidUUIDs(ids: unknown[]): string[] {
    return ids.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id));
}

// 에러 메시지 sanitize 로직 — route.ts catch 블록과 동일
function sanitizeErrorMessage(rawMsg: string): string {
    return rawMsg.includes('did not match')
        || rawMsg.includes('violates')
        || rawMsg.includes('duplicate key')
        || rawMsg.includes('connection')
        ? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        : rawMsg;
}

// ─── 핵심 테스트: "The string did not match the expected pattern" 방지 ───
describe('UUID 검증 — uploadIds 필터링', () => {
    it('유효한 UUID만 통과시킴', () => {
        const ids = [
            'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'AABBCCDD-1122-3344-5566-778899AABBCC',
        ];
        expect(filterValidUUIDs(ids)).toHaveLength(2);
    });

    it('UUID가 아닌 문자열을 필터링함', () => {
        const ids = [
            'not-a-uuid',
            '12345',
            '',
            'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // 유효
        ];
        expect(filterValidUUIDs(ids)).toEqual([
            'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        ]);
    });

    it('undefined, null, 숫자 등 비문자열 값을 필터링함', () => {
        const ids = [undefined, null, 123, true, { id: 'test' }];
        expect(filterValidUUIDs(ids)).toEqual([]);
    });

    it('빈 배열이면 빈 배열 반환', () => {
        expect(filterValidUUIDs([])).toEqual([]);
    });

    it('전부 잘못된 ID면 빈 배열 반환 — API에서 400 에러로 처리됨', () => {
        const ids = ['abc', 'def', '123'];
        const valid = filterValidUUIDs(ids);
        expect(valid).toEqual([]);
        // route.ts에서: if (validIds.length === 0) return 400
    });

    it('실제 Supabase가 생성하는 UUID v4 형식을 통과시킴', () => {
        const supabaseUUIDs = [
            '550e8400-e29b-41d4-a716-446655440000',
            '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];
        expect(filterValidUUIDs(supabaseUUIDs)).toHaveLength(3);
    });
});

// ─── 에러 메시지 sanitize 테스트 ───
describe('에러 메시지 sanitize — 내부 에러 숨김', () => {
    it('"The string did not match the expected pattern" → 사용자 친화적 메시지', () => {
        const msg = sanitizeErrorMessage('The string did not match the expected pattern.');
        expect(msg).toBe('서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        expect(msg).not.toContain('did not match');
    });

    it('"violates foreign key constraint" → 사용자 친화적 메시지', () => {
        const msg = sanitizeErrorMessage('insert or update on table "analyses" violates foreign key constraint');
        expect(msg).toBe('서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });

    it('"duplicate key value violates unique constraint" → 사용자 친화적 메시지', () => {
        const msg = sanitizeErrorMessage('duplicate key value violates unique constraint "analyses_pkey"');
        expect(msg).toBe('서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });

    it('"connection refused" → 사용자 친화적 메시지', () => {
        const msg = sanitizeErrorMessage('connection refused to host db.supabase.co');
        expect(msg).toBe('서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });

    it('AI 관련 에러는 그대로 전달 (사용자에게 유용한 정보)', () => {
        const msg = sanitizeErrorMessage('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
        expect(msg).toBe('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
    });

    it('한도 초과 에러는 그대로 전달', () => {
        const msg = sanitizeErrorMessage('이번 달 분석 한도를 초과했습니다.');
        expect(msg).toBe('이번 달 분석 한도를 초과했습니다.');
    });
});
