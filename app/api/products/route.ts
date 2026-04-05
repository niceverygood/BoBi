// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchProducts } from '@/lib/insurance/product-matcher';
import type { AnalysisResult } from '@/types/analysis';

export const maxDuration = 300;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { analysisId } = await request.json();

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

        // Run product matching
        const result = await matchProducts(analysis.medical_history as unknown as AnalysisResult);

        // Update analysis with product eligibility
        await supabase
            .from('analyses')
            .update({
                product_eligibility: result as unknown as Record<string, unknown>,
                updated_at: new Date().toISOString(),
            })
            .eq('id', analysisId);

        return NextResponse.json({ products: result });
    } catch (error) {
        console.error('Products error:', error);
        return NextResponse.json({
            error: `상품 판단 중 오류가 발생했습니다: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
