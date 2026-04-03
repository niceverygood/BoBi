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

    // 정지된 유저 쉐도우밴 — 정지 사실을 모르게 조용히 로그아웃 후 랜딩페이지로 이동
    if (user && user.user_metadata?.suspended === true) {
        if (isProtectedRoute || isAdminRoute || (isApiRoute && !request.nextUrl.pathname.startsWith('/api/auth'))) {
            // API 요청이면 일반적인 인증 에러처럼 반환 (정지 사실 숨김)
            if (isApiRoute) {
                return NextResponse.json(
                    { error: '인증이 필요합니다.' },
                    { status: 401 },
                );
            }
            // 페이지 요청이면 조용히 세션 삭제 후 랜딩페이지로
            await supabase.auth.signOut();
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
        // auth 경로 접근 시에도 조용히 로그아웃 (재로그인해도 다시 튕김)
        if (isAuthRoute) {
            await supabase.auth.signOut();
            return supabaseResponse;
        }
    }

    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
