// app/api/coverage/history/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('coverage_analyses')
            .select('id, customer_name, customer_birth, customer_gender, policy_count, overall_score, overall_grade, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Coverage history error:', error);
            return NextResponse.json({ error: '이력 조회 실패' }, { status: 500 });
        }

        return NextResponse.json({ analyses: data || [] });
    } catch (error) {
        console.error('Coverage history error:', error);
        return NextResponse.json({ error: '서버 오류' }, { status: 500 });
    }
}
