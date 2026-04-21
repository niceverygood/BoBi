import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 고객 단위 건강검진 저장소.
 *
 * 설계:
 *   - CODEF로 한 번 조회한 결과(검진 수치 + AI 추정)를 고객 프로필에 묶어 영구 저장
 *   - 위험도 리포트·미래의나·보장 분석 등에서 자동 참조해 CODEF 재호출 비용을 아낌
 *   - 같은 검진연도 중복 저장 금지 (UNIQUE(customer_id, checkup_year))
 */

export const HEALTH_CHECKUP_EXPIRY_DAYS = 365;

export interface HealthCheckupRawResults {
    checkup?: unknown;
    healthAge?: unknown;
    stroke?: unknown;
    cardio?: unknown;
}

export interface ClientHealthCheckupRow {
    id: string;
    customer_id: string;
    user_id: string;
    checkup_data: Record<string, unknown>;
    health_age: Record<string, unknown> | null;
    stroke_prediction: Record<string, unknown> | null;
    cardio_prediction: Record<string, unknown> | null;
    checkup_year: string | null;
    checked_at: string;
    expires_at: string | null;
}

/** CODEF 응답에서 검진 연도를 추출 (resPreviewList[0].resCheckupYear) */
function extractCheckupYear(raw: HealthCheckupRawResults): string | null {
    const checkup = raw.checkup as { resPreviewList?: Array<{ resCheckupYear?: string }> } | undefined;
    const year = checkup?.resPreviewList?.[0]?.resCheckupYear;
    return year ? String(year) : null;
}

/**
 * 조회된 건강검진 결과를 고객 단위로 저장(Upsert).
 * 같은 연도 중복이면 최신 데이터로 덮어쓴다.
 */
export async function saveClientHealthCheckup(
    supabase: SupabaseClient,
    params: {
        customerId: string;
        userId: string;
        results: HealthCheckupRawResults;
    },
): Promise<{ success: boolean; error?: string; id?: string }> {
    const { customerId, userId, results } = params;

    const checkupYear = extractCheckupYear(results);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + HEALTH_CHECKUP_EXPIRY_DAYS);

    const payload = {
        customer_id: customerId,
        user_id: userId,
        checkup_data: (results.checkup as Record<string, unknown>) ?? {},
        health_age: (results.healthAge as Record<string, unknown>) ?? null,
        stroke_prediction: (results.stroke as Record<string, unknown>) ?? null,
        cardio_prediction: (results.cardio as Record<string, unknown>) ?? null,
        checkup_year: checkupYear,
        checked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
    };

    // checkup_year가 null이면 unique 충돌이 없으므로 단순 insert.
    // 있으면 (customer_id, checkup_year) 기준 upsert.
    if (checkupYear) {
        const { data, error } = await supabase
            .from('client_health_checkups')
            .upsert(payload, { onConflict: 'customer_id,checkup_year' })
            .select('id')
            .maybeSingle();
        if (error) return { success: false, error: error.message };
        return { success: true, id: data?.id };
    }

    const { data, error } = await supabase
        .from('client_health_checkups')
        .insert(payload)
        .select('id')
        .single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
}

/** 고객의 최신 건강검진 1건 조회 (checked_at 내림차순). */
export async function getLatestClientHealthCheckup(
    supabase: SupabaseClient,
    customerId: string,
): Promise<ClientHealthCheckupRow | null> {
    const { data } = await supabase
        .from('client_health_checkups')
        .select('*')
        .eq('customer_id', customerId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return (data as ClientHealthCheckupRow) || null;
}

/**
 * 저장소 row → 기존 API/프롬프트가 기대하는 raw results 형태로 변환.
 * 위험도 리포트·미래의나가 사용하는 summarizeHealthCheckup 등 기존 로직과 호환.
 */
export function rowToResults(row: ClientHealthCheckupRow): HealthCheckupRawResults {
    return {
        checkup: row.checkup_data,
        healthAge: row.health_age ?? undefined,
        stroke: row.stroke_prediction ?? undefined,
        cardio: row.cardio_prediction ?? undefined,
    };
}

/** 만료 여부 확인 (expires_at 기준, 없으면 만료 안 됨으로 간주). */
export function isExpired(row: ClientHealthCheckupRow): boolean {
    if (!row.expires_at) return false;
    return new Date(row.expires_at).getTime() < Date.now();
}
