import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError } from '../client';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function textResponse(text: string, status = 500) {
    return new Response(text, { status });
}

// ─── 핵심 테스트 1: 스크린샷 에러 재현 ───
// "Unexpected token 'A', 'An error o'... is not valid JSON"
describe('apiFetch — 첫 번째 에러 재현: 서버가 HTML/텍스트 에러 반환', () => {
    it('서버가 "An error occurred..." 텍스트를 반환해도 JSON 파싱 에러 대신 친절한 메시지 반환', async () => {
        mockFetch.mockResolvedValueOnce(
            textResponse('An error occurred while processing your request.', 500),
        );

        await expect(apiFetch('/api/analyze')).rejects.toThrow(
            '서버에서 오류가 발생했습니다',
        );
    });

    it('서버가 HTML 에러 페이지를 반환해도 크래시하지 않음', async () => {
        mockFetch.mockResolvedValueOnce(
            textResponse('<html><body>502 Bad Gateway</body></html>', 502),
        );

        try {
            await apiFetch('/api/analyze');
            expect.fail('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ApiError);
            expect((err as ApiError).message).toContain('서버에서 오류가 발생했습니다');
            expect((err as ApiError).status).toBe(502);
        }
    });

    it('서버가 빈 응답을 반환해도 크래시하지 않음', async () => {
        mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

        await expect(apiFetch('/api/analyze')).rejects.toThrow(
            '서버 응답을 처리할 수 없습니다',
        );
    });
});

// ─── 핵심 테스트 2: 두 번째 에러 재현 ───
// "The string did not match the expected pattern."
describe('apiFetch — 두 번째 에러 재현: Supabase UUID 에러가 JSON으로 올 때', () => {
    it('서버가 { error: "...did not match..." } JSON 에러를 반환하면 ApiError로 전달', async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse(
                { error: '분석 중 오류가 발생했습니다: 서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
                500,
            ),
        );

        try {
            await apiFetch('/api/analyze');
            expect.fail('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ApiError);
            expect((err as ApiError).message).toContain('서버 내부 오류');
            expect((err as ApiError).message).not.toContain('did not match');
        }
    });
});

// ─── 정상 동작 테스트 ───
describe('apiFetch — 정상 동작', () => {
    it('정상 JSON 응답을 파싱하여 반환', async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ analysisId: 'abc-123', result: { items: [] } }),
        );

        const data = await apiFetch<{ analysisId: string }>('/api/analyze');
        expect(data.analysisId).toBe('abc-123');
    });

    it('body 옵션이 있으면 JSON.stringify + Content-Type 자동 설정', async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

        await apiFetch('/api/test', { method: 'POST', body: { foo: 'bar' } });

        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/test');
        expect(opts.headers['Content-Type']).toBe('application/json');
        expect(opts.body).toBe('{"foo":"bar"}');
    });

    it('서버가 { error: "메시지" }를 반환하면 해당 메시지로 에러 throw', async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ error: '이번 달 분석 한도를 초과했습니다.' }, 429),
        );

        await expect(apiFetch('/api/analyze')).rejects.toThrow(
            '이번 달 분석 한도를 초과했습니다.',
        );
    });
});

// ─── 네트워크 에러 테스트 ───
describe('apiFetch — 네트워크 에러', () => {
    it('fetch 자체가 실패하면 네트워크 에러 메시지 반환', async () => {
        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(apiFetch('/api/test')).rejects.toThrow(
            '네트워크 연결에 문제가 있습니다',
        );
    });

    it('AbortError (타임아웃)이면 시간 초과 메시지 반환', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        mockFetch.mockRejectedValueOnce(abortError);

        await expect(apiFetch('/api/test')).rejects.toThrow(
            '요청 시간이 초과되었습니다',
        );
    });
});
