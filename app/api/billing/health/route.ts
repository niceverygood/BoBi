// app/api/billing/health/route.ts
// 정기결제 설정 진단 엔드포인트 (관리자만 접근 가능)
// GET /api/billing/health → PortOne, Inicis, DB 설정 상태 점검
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 관리자만 접근
    const isAdmin = user.user_metadata?.is_admin === true
        || user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; detail: string }> = [];

    // 1. 환경변수 체크
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    checks.push({
        name: 'PortOne Store ID',
        status: storeId ? 'ok' : 'fail',
        detail: storeId ? `${storeId.substring(0, 12)}...` : '미설정 — 결제창 호출 불가',
    });

    const billingChannelKey = process.env.NEXT_PUBLIC_PORTONE_INICIS_BILLING_CHANNEL_KEY;
    checks.push({
        name: 'Inicis 정기결제 Channel Key',
        status: billingChannelKey ? 'ok' : 'fail',
        detail: billingChannelKey
            ? `${billingChannelKey.substring(0, 30)}...`
            : '미설정 — 빌링키 발급 불가',
    });

    const apiSecret = process.env.PORTONE_API_SECRET;
    checks.push({
        name: 'PortOne API Secret',
        status: apiSecret ? 'ok' : 'fail',
        detail: apiSecret ? '설정됨 (서버 전용)' : '미설정 — 빌링키 결제 불가',
    });

    // 2. PortOne 토큰 발급 테스트
    if (apiSecret) {
        try {
            const tokenResp = await fetch('https://api.portone.io/login/api-secret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiSecret }),
            });
            if (tokenResp.ok) {
                const tokenData = await tokenResp.json();
                checks.push({
                    name: 'PortOne 토큰 발급',
                    status: 'ok',
                    detail: `성공 (만료 ${tokenData.expires_in}s)`,
                });
            } else {
                const errText = await tokenResp.text();
                checks.push({
                    name: 'PortOne 토큰 발급',
                    status: 'fail',
                    detail: `실패 ${tokenResp.status}: ${errText.substring(0, 100)}`,
                });
            }
        } catch (err) {
            checks.push({
                name: 'PortOne 토큰 발급',
                status: 'fail',
                detail: `예외: ${(err as Error).message}`,
            });
        }
    }

    // 3. DB 테이블 존재 여부
    const svc = await createServiceClient();

    for (const table of ['billing_keys', 'payment_history', 'payments', 'subscriptions', 'subscription_plans']) {
        try {
            const { error } = await svc.from(table).select('*', { count: 'exact', head: true });
            checks.push({
                name: `DB 테이블: ${table}`,
                status: error ? 'fail' : 'ok',
                detail: error ? error.message : '존재',
            });
        } catch (err) {
            checks.push({
                name: `DB 테이블: ${table}`,
                status: 'fail',
                detail: (err as Error).message,
            });
        }
    }

    // 4. 활성 구독 통계
    try {
        const { data: inicisSubscriptions, count: inicisCount } = await svc
            .from('subscriptions')
            .select('id', { count: 'exact' })
            .eq('status', 'active')
            .eq('payment_provider', 'portone_inicis');

        const { count: totalActiveCount } = await svc
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');

        checks.push({
            name: '이니시스 정기결제 활성 구독',
            status: 'ok',
            detail: `${inicisCount ?? 0}건 (전체 active ${totalActiveCount ?? 0}건)`,
        });

        // 빌링키 테이블에서 이니시스 건수
        const { count: inicisBillingKeyCount } = await svc
            .from('billing_keys')
            .select('user_id', { count: 'exact', head: true })
            .eq('provider', 'portone_inicis');

        checks.push({
            name: '이니시스 빌링키 저장 수',
            status: 'ok',
            detail: `${inicisBillingKeyCount ?? 0}개`,
        });
    } catch (err) {
        checks.push({
            name: '구독 통계',
            status: 'warn',
            detail: (err as Error).message,
        });
    }

    const hasFail = checks.some(c => c.status === 'fail');

    return NextResponse.json({
        overall: hasFail ? 'fail' : 'ok',
        summary: hasFail
            ? '⚠️ 일부 설정이 누락되어 정기결제가 동작하지 않습니다.'
            : '✅ 정기결제 설정이 모두 정상입니다.',
        checks,
        timestamp: new Date().toISOString(),
    });
}
