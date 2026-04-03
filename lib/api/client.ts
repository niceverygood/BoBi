/**
 * 안전한 API 클라이언트 — 모든 내부 fetch 호출에 사용
 *
 * - JSON 파싱 실패 시 친절한 에러 메시지 반환
 * - 타임아웃 지원
 * - 네트워크 에러 처리
 * - response.ok 자동 체크
 */

export class ApiError extends Error {
    status: number;
    data: Record<string, unknown> | null;

    constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    /** 타임아웃 (ms). 기본값: 없음 (브라우저 기본값 사용) */
    timeout?: number;
}

/**
 * 안전한 fetch wrapper.
 *
 * @example
 * const data = await apiFetch<{ result: AnalysisResult }>('/api/analyze', {
 *   method: 'POST',
 *   body: { uploadIds: ['abc'] },
 * });
 *
 * @throws {ApiError} 서버가 에러 응답을 반환했을 때
 * @throws {Error} 네트워크 에러 또는 타임아웃
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: ApiOptions = {},
): Promise<T> {
    const { body, timeout, ...fetchOptions } = options;

    // JSON body 자동 직렬화
    if (body !== undefined) {
        fetchOptions.headers = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        };
        (fetchOptions as RequestInit).body = JSON.stringify(body);
    }

    // 타임아웃 지원
    let controller: AbortController | undefined;
    if (timeout) {
        controller = new AbortController();
        fetchOptions.signal = controller.signal;
        setTimeout(() => controller!.abort(), timeout);
    }

    let response: Response;
    try {
        response = await fetch(url, fetchOptions as RequestInit);
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        throw new Error('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.');
    }

    // JSON 파싱 — 실패해도 에러 발생하지 않도록 안전하게 처리
    let data: T | null = null;
    try {
        data = await response.json();
    } catch {
        if (!response.ok) {
            throw new ApiError(
                '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                response.status,
            );
        }
        throw new ApiError(
            '서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.',
            response.status,
        );
    }

    // 서버 에러 응답 처리
    if (!response.ok) {
        const errorData = data as unknown as Record<string, unknown>;
        const message = (errorData?.error as string) || '요청 처리에 실패했습니다.';
        throw new ApiError(message, response.status, errorData);
    }

    return data as T;
}
