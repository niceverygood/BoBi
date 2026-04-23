import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 로컬 생성용 — DB에 generate_referral_code() 함수도 있지만 fallback 용.
 * 혼동 쉬운 0/O, 1/I, 2/Z 등 일부 제외.
 */
function generateCodeLocal(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

/**
 * 사용자에게 고유 초대 코드를 발급 (이미 있으면 그대로 반환).
 * service role 또는 본인 권한으로 호출.
 */
export async function ensureReferralCode(
    supabase: SupabaseClient,
    userId: string,
): Promise<string> {
    // 기존 코드 먼저 조회
    const { data: existing } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle();

    if (existing?.code) return existing.code as string;

    // 새로 생성 (충돌 시 재시도)
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCodeLocal();
        const { error } = await supabase
            .from('referral_codes')
            .insert({ code, user_id: userId });
        if (!error) return code;
        // 23505 = unique violation: 다시 시도
        if ((error as { code?: string }).code !== '23505') {
            throw error;
        }
    }
    throw new Error('초대 코드 생성에 실패했습니다.');
}

/**
 * 코드로 inviter user_id 조회.
 */
export async function lookupInviterByCode(
    supabase: SupabaseClient,
    code: string,
): Promise<string | null> {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,10}$/.test(normalized)) return null;
    const { data } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', normalized)
        .maybeSingle();
    return (data?.user_id as string) ?? null;
}
