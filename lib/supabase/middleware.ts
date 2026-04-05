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

    // 정지된 유저 처리
    if (user && user.user_metadata?.suspended === true) {
        const suspendType = user.user_metadata?.suspend_type as string; // 'shadow' | 'official'

        if (isProtectedRoute || isAdminRoute || (isApiRoute && !request.nextUrl.pathname.startsWith('/api/auth'))) {
            if (suspendType === 'official') {
                // ── 공식 정지: 명확하게 정지 사실 고지 ──
                if (isApiRoute) {
                    const reason = user.user_metadata?.suspended_reason || '이용약관 위반';
                    return NextResponse.json(
                        { error: `계정이 이용정지 상태입니다. 사유: ${reason}` },
                        { status: 403 },
                    );
                }
                const url = request.nextUrl.clone();
                url.pathname = '/auth/login';
                url.searchParams.set('suspended', 'official');
                url.searchParams.set('reason', user.user_metadata?.suspended_reason || '이용약관 위반');
                await supabase.auth.signOut();
                return NextResponse.redirect(url);
            } else {
                // ── 쉐도우 정지: 정지 사실 숨김, 조용히 로그아웃 ──
                if (isApiRoute) {
                    return NextResponse.json(
                        { error: '인증이 필요합니다.' },
                        { status: 401 },
                    );
                }
                await supabase.auth.signOut();
                const url = request.nextUrl.clone();
                url.pathname = '/';
                return NextResponse.redirect(url);
            }
        }
        // auth 경로: 쉐도우는 조용히 로그아웃, 공식은 통과 (로그인 페이지에서 메시지 표시)
        if (isAuthRoute) {
            if (suspendType !== 'official') {
                await supabase.auth.signOut();
            }
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
