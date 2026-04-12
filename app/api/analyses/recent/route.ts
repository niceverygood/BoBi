import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 최근 분석 목록 조회 (건강검진 데이터 통합용)
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

    const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, customer_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('medical_history', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 고객 이름 매핑
    const customerIds = [...new Set((data || []).map(d => d.customer_id).filter(Boolean))];
    let customerMap = new Map<string, string>();

    if (customerIds.length > 0) {
        const { data: customers } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds as string[]);
        customerMap = new Map((customers || []).map(c => [c.id, c.name || '이름 없음']));
    }

    const analyses = (data || []).map(d => ({
        id: d.id,
        created_at: d.created_at,
        customer_name: d.customer_id ? customerMap.get(d.customer_id) : undefined,
    }));

    return NextResponse.json({ analyses });
}
