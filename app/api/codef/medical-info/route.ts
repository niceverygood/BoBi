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
            identity,               // 주민등록번호 13자리
            phoneNo,                // 01012345678
            loginType = '5',        // '5': 간편인증 (HIRA는 항상 간편인증)
            loginTypeLevel,         // 간편인증사 코드 (CODEF 공식: '1'=카카오, '5'=PASS, '6'=네이버 등)
            telecom,                // 통신사 (PASS 인증 시 필수, '0'=SKT, '1'=KT, '2'=LGU+)
            queryType = 'medical',  // 'medical' | 'car' | 'both'
            // 조회 조건
            searchStartDay,         // 조회시작일 YYYYMMDD (기본: 5년전)
            searchEndDay,           // 조회종료일 YYYYMMDD (기본: 오늘)
            inquiryType,            // '0'=전체, '1'=급여, '2'=비급여
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

        // 주민등록번호 13자리 검증
        const cleanIdentity = identity.replace(/\D/g, '');
        if (cleanIdentity.length !== 13) {
            return NextResponse.json({
                error: `주민등록번호가 올바르지 않습니다. (${cleanIdentity.length}자리 입력됨, 13자리 필요)`,
            }, { status: 400 });
        }

        // 세션 ID 생성 (동일 사용자의 다건 요청을 하나의 인증으로 처리)
        const sessionId = body.sessionId || `bobi-${user.id}-${Date.now()}`;

        const params: HiraMedicalRequest = {
            userName,
            identity: cleanIdentity,
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            telecom,
            id: sessionId,
            // HIRA 필수 조회조건
            searchStartDay,
            searchEndDay,
            inquiryType: inquiryType || '0', // 기본: 전체
            // 2-Way
            is2Way,
            twoWayInfo,
            secureNo,
            secureNoRefresh,
        };

        // 디버그 로깅 (민감정보 마스킹)
        console.log('[HIRA] Request params:', {
            userName: userName ? `${userName[0]}**` : 'N/A',
            identityLength: cleanIdentity.length,
            phoneNo: phoneNo ? `***${phoneNo.slice(-4)}` : 'N/A',
            loginType,
            loginTypeLevel,
            telecom: telecom || 'N/A',
            queryType,
            searchStartDay: params.searchStartDay || '(auto: 5yr ago)',
            searchEndDay: params.searchEndDay || '(auto: today)',
            inquiryType: params.inquiryType,
            is2Way: !!is2Way,
            sessionId,
        });

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
                console.log('[HIRA] 2-Way 인증 요청됨 (medical)');
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
            console.log(`[HIRA] 내진료정보 조회 완료: ${medicalResult.records.length}건`);
        }

        // 자동차보험 조회
        if (queryType === 'car' || queryType === 'both') {
            const carResult = await fetchMyCarInsurance(params);

            if (carResult.requires2Way) {
                console.log('[HIRA] 2-Way 인증 요청됨 (car)');
                return NextResponse.json({
                    requires2Way: true,
                    twoWayData: carResult.twoWayData,
                    sessionId,
                    queryType,
                    ...(result.medical ? { medical: result.medical } : {}),
                });
            }

            result.carInsurance = {
                records: carResult.records,
                count: carResult.records.length,
            };
            console.log(`[HIRA] 자동차보험 조회 완료: ${carResult.records.length}건`);
        }

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('[HIRA] Error:', errorMessage);
        console.error('[HIRA] Full error:', error);

        // 에러 메시지 사용자 친화적으로 가공
        let userMessage = errorMessage;
        if (errorMessage.includes('CF-13002')) {
            userMessage = '요청 파라미터 오류입니다. 주민등록번호 13자리를 정확히 입력했는지 확인해주세요.';
        } else if (errorMessage.includes('CF-12871')) {
            userMessage = '선택하신 인증 앱이 설치되지 않았거나 인증서가 발급되지 않았습니다. 앱 설치 및 인증서 발급 후 다시 시도하시거나, 다른 인증 방식(카카오톡, 토스 등)을 이용해주세요.';
        } else if (errorMessage.includes('CF-12872')) {
            userMessage = '인증서가 만료되었습니다. 인증서를 재발급 후 다시 시도해주세요.';
        } else if (errorMessage.includes('CF-11021')) {
            userMessage = '인증 시간이 초과되었습니다. 다시 시도해주세요.';
        } else if (errorMessage.includes('CF-03002')) {
            userMessage = '추가 인증이 필요합니다. 앱에서 인증을 완료해주세요.';
        } else if (errorMessage.includes('CF-12801') || errorMessage.includes('CF-12802')) {
            userMessage = '본인인증에 실패했습니다. 입력 정보를 확인하시고 다시 시도해주세요.';
        } else if (errorMessage.includes('CF-00023') || errorMessage.includes('CF-09999')) {
            userMessage = '서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }

        return NextResponse.json({
            error: `진료정보 조회 중 오류가 발생했습니다: ${userMessage}`,
            errorCode: errorMessage.match(/CF-\d+/)?.[0] || undefined,
        }, { status: 500 });
    }
}
