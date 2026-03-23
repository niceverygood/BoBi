// app/api/auth/logout/route.ts
// 서버 측 로그아웃 처리 - 쿠키까지 확실히 삭제
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
    const supabase = await createClient();

    // 모든 세션 삭제 (global scope)
    await supabase.auth.signOut({ scope: 'global' });

    // 로그인 페이지로 리다이렉트
    const response = NextResponse.json({ success: true });

    // Supabase 관련 쿠키 전부 삭제
    const cookieNames = [
        'sb-access-token',
        'sb-refresh-token',
    ];

    // sb- 로 시작하는 쿠키 삭제 (Supabase SSR 쿠키)
    for (const name of cookieNames) {
        response.cookies.delete(name);
    }

    // @supabase/ssr이 생성하는 청크 쿠키도 삭제
    // 패턴: sb-{project-ref}-auth-token, sb-{project-ref}-auth-token.0, .1 등
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';

    if (projectRef) {
        const baseName = `sb-${projectRef}-auth-token`;
        response.cookies.set(baseName, '', { maxAge: 0, path: '/' });

        // 청크 쿠키도 삭제 (최대 10개까지)
        for (let i = 0; i < 10; i++) {
            response.cookies.set(`${baseName}.${i}`, '', { maxAge: 0, path: '/' });
        }
    }

    return response;
}
