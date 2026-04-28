// app/api/codef/product-terms/route.ts
// 보험상품 약관/보장 상세 조회 API
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchInsuranceContracts,
    transformContractToTerms,
    type ProductTermsInfo,
} from '@/lib/codef/client';
import { getUserPlan, canAccessCodef } from '@/lib/subscription/access';

export const maxDuration = 120;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const plan = await getUserPlan(supabase, user.id);
        if (!canAccessCodef(plan)) {
            return NextResponse.json(
                {
                    error: '약관 자동 조회는 베이직 플랜 이상에서 이용 가능합니다.',
                    requiresPlan: 'basic',
                    feature: 'codef_product_terms',
                },
                { status: 403 },
            );
        }

        const body = await request.json();
        const { connectedId } = body;

        if (!connectedId) {
            return NextResponse.json({
                error: '먼저 내보험다보여 자동조회를 실행해주세요.',
            }, { status: 400 });
        }

        // 내보험다보여에서 전체 계약 조회 (보장 상세 포함)
        const contracts = await fetchInsuranceContracts(connectedId);

        // 약관/보장 상세 정보로 변환
        const products: ProductTermsInfo[] = contracts.map(contract =>
            transformContractToTerms(contract)
        );

        // 보험사별 그룹핑
        const byInsurer: Record<string, ProductTermsInfo[]> = {};
        for (const product of products) {
            if (!product.insurer) continue;
            if (!byInsurer[product.insurer]) byInsurer[product.insurer] = [];
            byInsurer[product.insurer].push(product);
        }

        return NextResponse.json({
            success: true,
            products,
            byInsurer,
            summary: {
                totalProducts: products.length,
                totalRiders: products.reduce((sum, p) => sum + p.riders.length, 0),
                totalCoverages: products.reduce((sum, p) => sum + p.all_coverages.length, 0),
                insurers: Object.keys(byInsurer),
                totalPremium: products.reduce((sum, p) => sum + p.monthly_premium, 0),
            },
        });
    } catch (error) {
        const errorMessage = (error as Error).message;

        if (errorMessage.startsWith('CODEF_2WAY:')) {
            return NextResponse.json({
                requires2Way: true,
                message: '추가 인증이 필요합니다.',
            });
        }

        console.error('Product terms fetch error:', error);
        return NextResponse.json({
            error: `보험상품 약관 조회 중 오류가 발생했습니다: ${errorMessage}`,
        }, { status: 500 });
    }
}
