// app/api/cron/expire-pro-grants/route.ts
// 매일(또는 매시간) 실행:
//   - pro_grants에서 expires_at <= now AND revoked_at IS NULL 인 건을 조회
//   - 실제로는 access 로직이 이미 expires_at을 확인해 플랜 승격을 안 하므로 "방치"해도 동작은 맞음
//   - 다만 관리/조회 편의를 위해 expired 상태를 명시적으로 플래그한다
//     (revoked_at에 만료 시각을 넣고 revoke_reason='expired' 로 설정).
//
// 환경변수 필요:
//   CRON_SECRET — Authorization: Bearer <value> 로 호출자 인증
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const now = new Date();
    const results = {
        processed: 0,
        expired: 0,
        failed: 0,
        errors: [] as string[],
    };

    try {
        const { data: expiring, error: fetchErr } = await svc
            .from('pro_grants')
            .select('id, user_id, expires_at')
            .is('revoked_at', null)
            .lte('expires_at', now.toISOString());

        if (fetchErr) {
            throw new Error(`pro_grants 조회 실패: ${fetchErr.message}`);
        }

        if (!expiring || expiring.length === 0) {
            return NextResponse.json({ message: '만료할 Pro 혜택이 없습니다.', ...results });
        }

        results.processed = expiring.length;

        for (const g of expiring) {
            try {
                const { error: updErr } = await svc
                    .from('pro_grants')
                    .update({
                        revoked_at: now.toISOString(),
                        revoke_reason: 'expired',
                    })
                    .eq('id', g.id)
                    .is('revoked_at', null);
                if (updErr) throw new Error(updErr.message);
                results.expired++;
            } catch (err) {
                results.failed++;
                results.errors.push(`grant=${g.id}: ${(err as Error).message}`);
            }
        }

        return NextResponse.json({ message: 'Pro 혜택 만료 처리 완료', ...results });
    } catch (err) {
        console.error('[cron/expire-pro-grants] 예외:', err);
        return NextResponse.json(
            { error: (err as Error).message, ...results },
            { status: 500 },
        );
    }
}
