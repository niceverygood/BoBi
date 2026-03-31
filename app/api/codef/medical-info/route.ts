// app/api/codef/medical-info/route.ts
// HIRA 내진료정보열람 + 자동차보험 진료정보 조회 API
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchMyMedicalInfo,
    fetchMyCarInsurance,
    type HiraMedicalRequest,
} from '@/lib/codef/client';

export const maxDuration = 120;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const {
            userName,
            identity,          // 주민등록번호 13자리
            phoneNo,           // 01012345678
            loginType = '5',   // '5': 간편인증
            loginTypeLevel,    // 간편인증사 코드
            telecom,           // 통신사 (휴대폰인증 시)
            queryType = 'medical',  // 'medical' | 'car' | 'both'
            // 2-Way 관련
            is2Way,
            twoWayInfo,
            secureNo,
            secureNoRefresh,
        } = body;

        if (!userName || !identity || !phoneNo) {
            return NextResponse.json({
                error: '이름, 주민등록번호, 전화번호를 입력해주세요.',
            }, { status: 400 });
        }

        // 세션 ID 생성 (동일 사용자의 다건 요청을 하나의 인증으로 처리)
        const sessionId = body.sessionId || `bobi-${user.id}-${Date.now()}`;

        const params: HiraMedicalRequest = {
            userName,
            identity: identity.replace(/\D/g, ''),
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            telecom,
            id: sessionId,
            is2Way,
            twoWayInfo,
            secureNo,
            secureNoRefresh,
        };

        const result: {
            sessionId: string;
            medical?: { records: unknown[]; count: number };
            carInsurance?: { records: unknown[]; count: number };
            requires2Way?: boolean;
            twoWayData?: Record<string, unknown>;
        } = { sessionId };

        // 내진료정보 조회
        if (queryType === 'medical' || queryType === 'both') {
            const medicalResult = await fetchMyMedicalInfo(params);

            if (medicalResult.requires2Way) {
                return NextResponse.json({
                    requires2Way: true,
                    twoWayData: medicalResult.twoWayData,
                    sessionId,
                    queryType,
                });
            }

            result.medical = {
                records: medicalResult.records,
                count: medicalResult.records.length,
            };
        }

        // 자동차보험 조회
        if (queryType === 'car' || queryType === 'both') {
            // 이미 인증 세션이 있으면 동일 세션으로 조회 (재인증 불필요)
            const carResult = await fetchMyCarInsurance(params);

            if (carResult.requires2Way) {
                return NextResponse.json({
                    requires2Way: true,
                    twoWayData: carResult.twoWayData,
                    sessionId,
                    queryType,
                    // medical 결과가 이미 있으면 같이 전달
                    ...(result.medical ? { medical: result.medical } : {}),
                });
            }

            result.carInsurance = {
                records: carResult.records,
                count: carResult.records.length,
            };
        }

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('HIRA medical info error:', error);
        return NextResponse.json({
            error: `진료정보 조회 중 오류가 발생했습니다: ${errorMessage}`,
        }, { status: 500 });
    }
}
