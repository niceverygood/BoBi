// app/api/coverage/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('coverage_analyses')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json({
            input: data.input_data,
            result: data.result_data,
        });
    } catch (error) {
        console.error('Coverage detail error:', error);
        return NextResponse.json({ error: '서버 오류' }, { status: 500 });
    }
}
