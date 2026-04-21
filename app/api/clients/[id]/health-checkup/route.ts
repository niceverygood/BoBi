// app/api/clients/[id]/health-checkup/route.ts
//
// 고객 단위 건강검진 저장/조회 API.
//   GET  /api/clients/{customerId}/health-checkup → 저장된 최신 검진
//   POST /api/clients/{customerId}/health-checkup → results 저장 (upsert)
//   DELETE                                         → 해당 고객 검진 이력 전체 삭제

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    saveClientHealthCheckup,
    getLatestClientHealthCheckup,
    isExpired,
    type HealthCheckupRawResults,
} from '@/lib/health-checkup/storage';

export const dynamic = 'force-dynamic';

async function authGuard(customerId: string) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) };
    }
    // 본인 고객인지 확인 (RLS도 있지만 명시적 체크)
    const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (!customer) {
        return { error: NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 }) };
    }
    return { supabase, user, customer };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: customerId } = await params;
    const guard = await authGuard(customerId);
    if (guard.error) return guard.error;

    const row = await getLatestClientHealthCheckup(guard.supabase, customerId);
    if (!row) {
        return NextResponse.json({ exists: false });
    }
    return NextResponse.json({
        exists: true,
        checkedAt: row.checked_at,
        checkupYear: row.checkup_year,
        expired: isExpired(row),
        expiresAt: row.expires_at,
        results: {
            checkup: row.checkup_data,
            healthAge: row.health_age,
            stroke: row.stroke_prediction,
            cardio: row.cardio_prediction,
        },
    });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: customerId } = await params;
    const guard = await authGuard(customerId);
    if (guard.error) return guard.error;

    let body: { results?: HealthCheckupRawResults } = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 400 });
    }
    if (!body.results || typeof body.results !== 'object') {
        return NextResponse.json({ error: 'results 필드가 필요합니다.' }, { status: 400 });
    }

    const result = await saveClientHealthCheckup(guard.supabase, {
        customerId,
        userId: guard.user.id,
        results: body.results,
    });

    if (!result.success) {
        return NextResponse.json({ error: result.error || '저장 실패' }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: result.id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: customerId } = await params;
    const guard = await authGuard(customerId);
    if (guard.error) return guard.error;

    const { error } = await guard.supabase
        .from('client_health_checkups')
        .delete()
        .eq('customer_id', customerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
