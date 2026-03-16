// app/api/claims/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeClaims } from '@/lib/insurance/claim-analyzer';

export const maxDuration = 120;
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { analysisId, productId } = await request.json();

        if (!analysisId) {
            return NextResponse.json({ error: '분석 ID가 필요합니다.' }, { status: 400 });
        }

        // Get analysis result
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single();

        if (analysisError || !analysis) {
            return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
        }

        if (!analysis.medical_history) {
            return NextResponse.json({ error: 'STEP 1 분석이 먼저 완료되어야 합니다.' }, { status: 400 });
        }

        // Get insurance clauses
        let clausesText = '일반적인 보험 약관 기준으로 판단해주세요.';

        if (productId) {
            const { data: clauses } = await supabase
                .from('insurance_clauses')
                .select('*')
                .eq('product_id', productId);

            if (clauses && clauses.length > 0) {
                clausesText = clauses
                    .map((c) => `[${c.clause_type}]\n${c.clause_text}`)
                    .join('\n\n');
            }
        }

        // Run claim analysis
        const medicalHistory = JSON.stringify(analysis.medical_history, null, 2);
        const result = await analyzeClaims(medicalHistory, clausesText);

        // Update analysis with claim assessment
        await supabase
            .from('analyses')
            .update({
                claim_assessment: result as unknown as Record<string, unknown>,
                updated_at: new Date().toISOString(),
            })
            .eq('id', analysisId);

        return NextResponse.json({ claims: result });
    } catch (error) {
        console.error('Claims error:', error);
        return NextResponse.json({
            error: `청구 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
