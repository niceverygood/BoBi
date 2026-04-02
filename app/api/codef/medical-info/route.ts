// app/api/codef/medical-info/route.ts
// HIRA 내진료정보열람 + 자동차보험 + NHIS 진료투약 통합 조회 API
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchMyMedicalInfo,
    fetchMyCarInsurance,
    fetchMyMedicine,
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
            loginType = '5',        // '2': 인증서/휴대폰, '5': 간편인증
            loginTypeLevel,         // 인증 구분 코드
            authMethod,             // loginType='2'+loginTypeLevel='1': '0'SMS '1'PASS
            telecom,                // 통신사
            queryType = 'medical',  // 'medical' | 'car' | 'both'
            startDate,              // 조회시작일 yyyyMMdd
            endDate,                // 조회종료일 yyyyMMdd
            // 2-Way 관련
            is2Way,
            twoWayInfo,
            simpleAuth,
            secureNo,
            secureNoRefresh,
            smsAuthNo,
        } = body;

        if (!userName || !identity || !phoneNo) {
            return NextResponse.json({
                error: '이름, 주민등록번호, 전화번호를 입력해주세요.',
            }, { status: 400 });
        }

        const cleanIdentity = identity.replace(/\D/g, '');
        if (cleanIdentity.length !== 13) {
            return NextResponse.json({
                error: `주민등록번호가 올바르지 않습니다. (${cleanIdentity.length}자리 입력됨, 13자리 필요)`,
            }, { status: 400 });
        }

        // "both" 진행 단계: 프론트에서 전달 ('medical' → 'car' 순차 진행)
        const bothStep = body.bothStep as string | undefined;
        // 이전 단계에서 이미 받은 medical 데이터 (both의 car 단계에서 전달)
        const previousMedical = body.previousMedical as { records: unknown[]; count: number } | undefined;

        const baseSessionId = body.sessionId || `bobi-${user.id}-${Date.now()}`;

        // medical과 car는 별도 CODEF 세션이 필요 (같은 세션 재사용 시 CF-00025 에러)
        const effectiveQueryType = bothStep || queryType;
        const sessionId = effectiveQueryType === 'car' ? `${baseSessionId}-car` : baseSessionId;

        const params: HiraMedicalRequest = {
            userName,
            identity: cleanIdentity,
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            authMethod,
            telecom,
            id: sessionId,
            startDate,
            endDate,
            type: '1',
            is2Way,
            twoWayInfo,
            simpleAuth,
            secureNo,
            secureNoRefresh,
            smsAuthNo,
        };

        console.log('[HIRA] Request:', {
            userName: userName ? `${userName[0]}**` : 'N/A',
            queryType,
            bothStep: bothStep || 'N/A',
            effectiveQueryType,
            sessionId,
            is2Way: !!is2Way,
        });

        const result: {
            sessionId: string;
            medical?: { records: unknown[]; count: number };
            carInsurance?: { records: unknown[]; count: number };
            myMedicine?: { records: unknown[]; count: number };
        } = { sessionId: baseSessionId };

        // 내진료정보 조회
        if (effectiveQueryType === 'medical' || effectiveQueryType === 'both') {
            // 다건 요청: 2-Way 인증 완료 시 내진료정보 + 내가먹는약을 동시 발사
            // CODEF 다건 요청 규칙: 요청A 송신 후 0.5~1초 이내 요청B 송신 → 세션 공유
            const is2WayCompletion = params.is2Way && params.twoWayInfo;

            if (is2WayCompletion && effectiveQueryType === 'medical') {
                // 2-Way 완료 시: 내진료정보(A) 발사 → 0.5초 후 내가먹는약(B) 발사 → 둘 다 수집
                const medicalPromise = fetchMyMedicalInfo(params);

                const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
                await delay(500);

                const medicineParams = {
                    ...params,
                    is2Way: undefined as unknown as boolean | undefined,
                    twoWayInfo: undefined as unknown as typeof params.twoWayInfo,
                    simpleAuth: undefined as unknown as string | undefined,
                    secureNo: undefined as unknown as string | undefined,
                    secureNoRefresh: undefined as unknown as string | undefined,
                    smsAuthNo: undefined as unknown as string | undefined,
                };
                const medicinePromise = fetchMyMedicine(medicineParams).catch(err => {
                    console.log('[HIRA] 내가먹는약 다건요청 실패:', (err as Error).message);
                    return null;
                });

                const [medicalResult, medicineResult] = await Promise.all([medicalPromise, medicinePromise]);

                if (medicalResult.requires2Way) {
                    return NextResponse.json({
                        requires2Way: true,
                        twoWayData: medicalResult.twoWayData,
                        sessionId: baseSessionId,
                        queryType,
                        bothStep: 'medical',
                    });
                }

                result.medical = { records: medicalResult.records, count: medicalResult.records.length };
                console.log(`[HIRA] 내진료정보 조회 완료: ${medicalResult.records.length}건`);

                if (medicineResult && !medicineResult.requires2Way) {
                    result.myMedicine = { records: medicineResult.records, count: medicineResult.records.length };
                    console.log(`[HIRA] 내가먹는약 다건요청 성공: ${medicineResult.records.length}건`);
                }
            } else {
                // 첫 요청 (2-Way 트리거) 또는 both 모드
                const medicalResult = await fetchMyMedicalInfo(params);

                if (medicalResult.requires2Way) {
                    console.log('[HIRA] 2-Way 인증 요청됨 (medical)');
                    return NextResponse.json({
                        requires2Way: true,
                        twoWayData: medicalResult.twoWayData,
                        sessionId: baseSessionId,
                        queryType,
                        bothStep: 'medical',
                    });
                }

                result.medical = { records: medicalResult.records, count: medicalResult.records.length };
                console.log(`[HIRA] 내진료정보 조회 완료: ${medicalResult.records.length}건`);
            }

            // "both"인 경우: medical 완료 후 car 인증을 위해 프론트에 반환
            if (queryType === 'both' && !bothStep) {
                return NextResponse.json({
                    needsCarAuth: true,
                    medical: result.medical,
                    sessionId: baseSessionId,
                    queryType,
                });
            }
        }

        // 자동차보험 조회
        if (effectiveQueryType === 'car') {
            const carResult = await fetchMyCarInsurance(params);

            if (carResult.requires2Way) {
                console.log('[HIRA] 2-Way 인증 요청됨 (car)');
                return NextResponse.json({
                    requires2Way: true,
                    twoWayData: carResult.twoWayData,
                    sessionId: baseSessionId,
                    queryType,
                    bothStep: 'car',
                    ...(previousMedical ? { medical: previousMedical } : {}),
                });
            }

            result.carInsurance = {
                records: carResult.records,
                count: carResult.records.length,
            };
            console.log(`[HIRA] 자동차보험 조회 완료: ${carResult.records.length}건`);
        }

        // both의 car 단계에서는 이전 medical 결과를 합침
        if (previousMedical && !result.medical) {
            result.medical = previousMedical;
        }

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('[HIRA] Error:', errorMessage);
        console.error('[HIRA] Full error:', error);

        // 에러 코드 추출 (다양한 하이픈 문자 대응: -, –, ‐, −)
        const codeMatch = errorMessage.match(/CF[\-\u2010\u2011\u2013\u2212](\d+)/);
        const errorCode = codeMatch ? `CF-${codeMatch[1]}` : undefined;

        // 에러 메시지 사용자 친화적으로 가공
        const ERROR_MESSAGES: Record<string, string> = {
            'CF-13002': '요청 파라미터 오류입니다. 주민등록번호 13자리를 정확히 입력했는지 확인해주세요.',
            'CF-12871': '선택하신 인증 앱이 설치되지 않았거나 인증서가 발급되지 않았습니다. 앱 설치 및 인증서 발급 후 다시 시도하시거나, 다른 인증 방식(카카오톡, 토스 등)을 이용해주세요.',
            'CF-12872': '인증서가 만료되었습니다. 인증서를 재발급 후 다시 시도해주세요.',
            'CF-11021': '인증 시간이 초과되었습니다. 다시 시도해주세요.',
            'CF-03002': '추가 인증이 필요합니다. 앱에서 인증을 완료해주세요.',
            'CF-12801': '본인인증에 실패했습니다. 입력 정보를 확인하시고 다시 시도해주세요.',
            'CF-12802': '본인인증에 실패했습니다. 입력 정보를 확인하시고 다시 시도해주세요.',
            'CF-00023': '서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            'CF-09999': '서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        };

        const userMessage = (errorCode && ERROR_MESSAGES[errorCode]) || errorMessage;

        return NextResponse.json({
            error: `진료정보 조회 중 오류가 발생했습니다: ${userMessage}`,
            errorCode,
        }, { status: 500 });
    }
}
