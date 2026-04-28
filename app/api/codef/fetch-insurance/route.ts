// app/api/codef/fetch-insurance/route.ts
// 코드에프 내보험다보여 API를 통한 보험 가입 현황 자동 조회
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    createConnectedId,
    fetchInsuranceContracts,
    transformCodefToBobi,
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
                    error: '보험 자동 조회는 베이직 플랜 이상에서 이용 가능합니다.',
                    requiresPlan: 'basic',
                    feature: 'codef_fetch_insurance',
                },
                { status: 403 },
            );
        }

        const body = await request.json();
        const {
            loginId,
            loginPassword,
            customerName,
            customerBirth,   // YYYY-MM-DD
            customerGender,  // 'M' | 'F'
            connectedId: existingConnectedId,
            // 2-Way 인증 관련
            twoWayData,
        } = body;

        if (!customerName || !customerBirth || !customerGender) {
            return NextResponse.json({ error: '고객 정보(이름, 생년월일, 성별)를 입력해주세요.' }, { status: 400 });
        }

        let connectedId = existingConnectedId;

        // Step 1: Connected ID가 없으면 생성
        if (!connectedId) {
            if (!loginId || !loginPassword) {
                return NextResponse.json({
                    error: '내보험다보여 로그인 정보(아이디, 비밀번호)를 입력해주세요.',
                }, { status: 400 });
            }

            // 생년월일을 yyMMdd 형태로 변환
            const birthParts = customerBirth.split('-');
            const birthDate = birthParts.length === 3
                ? birthParts[0].slice(2) + birthParts[1] + birthParts[2]
                : customerBirth;

            const result = await createConnectedId({
                organization: '0320', // 신용정보원(내보험다보여)
                loginType: '1',       // 간편인증
                loginId,
                loginPassword,
                birthDate,
            });

            // 2-Way 인증 필요한 경우
            if (result.startsWith('{')) {
                try {
                    const parsed = JSON.parse(result);
                    if (parsed.requires2Way) {
                        return NextResponse.json({
                            requires2Way: true,
                            twoWayData: parsed,
                        });
                    }
                } catch {
                    // JSON 파싱 실패 시 connectedId로 처리
                }
            }

            connectedId = result;
        }

        // Step 2: 계약정보 조회
        const contracts = await fetchInsuranceContracts(connectedId);

        // Step 3: BoBi CoverageInput으로 변환
        const coverageInput = transformCodefToBobi(
            contracts,
            customerName,
            customerBirth,
            customerGender as 'M' | 'F',
        );

        return NextResponse.json({
            success: true,
            connectedId,
            coverageInput,
            summary: {
                totalPolicies: coverageInput.policies.length,
                totalCoverages: coverageInput.policies.reduce((sum, p) => sum + p.coverages.length, 0),
                totalPremium: coverageInput.policies.reduce((sum, p) => sum + p.monthly_premium, 0),
                insurers: [...new Set(coverageInput.policies.map(p => p.insurer))],
            },
        });
    } catch (error) {
        const errorMessage = (error as Error).message;

        // 2-Way 추가 인증 필요
        if (errorMessage.startsWith('CODEF_2WAY:')) {
            const twoWayData = JSON.parse(errorMessage.replace('CODEF_2WAY:', ''));
            return NextResponse.json({
                requires2Way: true,
                twoWayData,
            });
        }

        console.error('CODEF fetch insurance error:', error);
        return NextResponse.json({
            error: `보험 정보 조회 중 오류가 발생했습니다: ${errorMessage}`,
        }, { status: 500 });
    }
}
