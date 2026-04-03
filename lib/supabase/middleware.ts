// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 보호된 경로 확인
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        return NextResponse.redirect(url);
    }

    // 정지된 유저 차단 (dashboard, API 접근 금지 — admin, auth 제외)
    if (user && user.user_metadata?.suspended === true) {
        if (isProtectedRoute || (isApiRoute && !request.nextUrl.pathname.startsWith('/api/auth'))) {
            // API 요청이면 JSON 에러 반환
            if (isApiRoute) {
                return NextResponse.json(
                    { error: '계정이 이용정지 상태입니다. 관리자에게 문의해주세요.' },
                    { status: 403 },
                );
            }
            // 페이지 요청이면 로그인으로 리다이렉트 (정지 메시지 표시)
            const url = request.nextUrl.clone();
            url.pathname = '/auth/login';
            url.searchParams.set('suspended', 'true');
            // 세션 삭제
            await supabase.auth.signOut();
            return NextResponse.redirect(url);
        }
    }

    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
