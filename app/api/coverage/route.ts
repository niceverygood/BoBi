// app/api/coverage/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeCoverage } from '@/lib/insurance/coverage-analyzer';
import type { CoverageInput } from '@/types/coverage';
import { FEATURE_FLAGS } from '@/lib/utils/constants';

export const maxDuration = 120;

export async function POST(request: Request) {
    // Feature flag guard
    if (!FEATURE_FLAGS.coverage_analysis) {
        return NextResponse.json(
            { error: '보장분석 기능은 현재 준비 중입니다. 마이데이터 사업자 등록 후 활성화 예정입니다.' },
            { status: 503 }
        );
    }

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body: CoverageInput = await request.json();

        if (!body.customer || !body.policies || body.policies.length === 0) {
            return NextResponse.json({ error: '고객 정보와 보험 내역을 입력해주세요.' }, { status: 400 });
        }

        // Run coverage analysis
        const result = await analyzeCoverage(body);

        // Save to DB
        await supabase
            .from('coverage_analyses')
            .insert({
                user_id: user.id,
                customer_name: body.customer.name,
                customer_birth: body.customer.birth,
                customer_gender: body.customer.gender,
                policy_count: body.policies.length,
                input_data: body as unknown as Record<string, unknown>,
                result_data: result as unknown as Record<string, unknown>,
                overall_score: result.overall_score.score,
                overall_grade: result.overall_score.grade,
            });

        return NextResponse.json({ result });
    } catch (error) {
        console.error('Coverage analysis error:', error);
        return NextResponse.json({
            error: `보장 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
