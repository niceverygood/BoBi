// app/api/codef/medical-info/route.ts
// HIRA 내진료정보열람 + 자동차보험 + NHIS 진료투약 통합 조회 API
//
// 누적 조회 정책:
//   HIRA 단건 호출은 정책상 1년치만 허용. 5년치를 모으려면 사용자가 1년 윈도우 단위로
//   여러 번 인증해야 한다. 이 라우트는 한 번의 인증으로 1년치를 받아 user_medical_records
//   테이블에 누적 저장한다. UI는 누적된 윈도우를 보여주고, 비어있는 윈도우만 추가 인증을
//   요청한다 (GET /api/codef/medical-info/accumulated 참조).
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
    fetchMyMedicalInfo,
    fetchMyCarInsurance,
    fetchMyMedicine,
    type HiraMedicalRequest,
} from '@/lib/codef/client';
import { getUserPlan, canAccessCodef } from '@/lib/subscription/access';

// 단건 호출(HIRA 1년 한도) — 일반적으로 30~60초. 누적 조회는 사용자가 여러 번 호출.
export const maxDuration = 120;

/**
 * yyyyMMdd(string) 또는 undefined를 받아 'YYYY-MM-DD' 형태로 정규화.
 * - input이 yyyyMMdd 형식이면 그대로 변환
 * - undefined이면 base 기준으로 yearOffset년 이동 (default base = 어제)
 *
 * fetchMyMedicalInfo의 default 기간(어제 ~ 1년 전)과 일치하도록 계산.
 */
function computePeriodDate(input: string | undefined, base?: string, yearOffset: number = 0): string {
    if (input && /^\d{8}$/.test(input)) {
        return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`;
    }
    if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }
    // base가 'YYYY-MM-DD' 형식이면 그 기준으로 yearOffset 이동
    if (base) {
        const d = new Date(base + 'T00:00:00Z');
        d.setUTCFullYear(d.getUTCFullYear() + yearOffset);
        if (yearOffset < 0) d.setUTCDate(d.getUTCDate() + 1); // 윤년 방어
        return d.toISOString().slice(0, 10);
    }
    // 그 외엔 어제 기준 (fetchMyMedicalInfo의 default endDate와 동일)
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

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
                    error: '진료정보 자동 조회는 베이직 플랜 이상에서 이용 가능합니다.',
                    requiresPlan: 'basic',
                    feature: 'codef_medical_info',
                },
                { status: 403 },
            );
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
                // HIRA 정책상 1회 인증으로 1년치만 받을 수 있어 chunked 호출은 폐기. 더 옛날 데이터가
                // 필요하면 frontend가 다른 startDate/endDate로 다시 인증을 진행한다.
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
                // 첫 요청 (2-Way 트리거) 또는 both 모드 — 단건 호출 (1년치)
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

        // 자동차보험 조회 (1년치)
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

        // 받은 1년치 데이터를 user_medical_records에 영구 저장 — 누적 조회 시스템.
        // 같은 (user, type, period) 조합은 ON CONFLICT로 갱신.
        // params.startDate/endDate가 없으면 fetchMyMedicalInfo가 자동으로 어제 기준 1년 전~어제로 잡음.
        //
        // ⚠️ 회귀 진단(이종인 5/10): "인증 다시해도 조회안됨" 호소.
        //   원인 후보: ① UPSERT 실패 silent catch ② 같은 윈도우로 덮어쓰기 ③ HIRA가 과거 기간 무시.
        //   대응: 저장 결과를 응답에 saveStatus로 포함 + 실패 시 사용자에게 노출.
        const periodEnd = computePeriodDate(params.endDate);
        const periodStart = computePeriodDate(params.startDate, periodEnd, -1);
        const saveStatus: Array<{ record_type: string; saved: boolean; count: number; error?: string }> = [];

        try {
            const svc = await createServiceClient();
            const rowsToSave: Array<{ record_type: string; records: unknown[] }> = [];
            if (result.medical?.records) rowsToSave.push({ record_type: 'medical', records: result.medical.records });
            if (result.carInsurance?.records) rowsToSave.push({ record_type: 'car_insurance', records: result.carInsurance.records });
            if (result.myMedicine?.records) rowsToSave.push({ record_type: 'medicine', records: result.myMedicine.records });

            console.log('[HIRA] 누적 저장 시도:', {
                userId: user.id.slice(0, 8) + '...',
                periodStart,
                periodEnd,
                paramsSent: { startDate: params.startDate, endDate: params.endDate },
                rowCount: rowsToSave.length,
                recordsByType: rowsToSave.map(r => `${r.record_type}=${r.records.length}건`).join(', '),
            });

            for (const row of rowsToSave) {
                const { error: upsertErr } = await svc.from('user_medical_records').upsert({
                    user_id: user.id,
                    record_type: row.record_type,
                    period_start: periodStart,
                    period_end: periodEnd,
                    records: row.records,
                    record_count: row.records.length,
                    fetched_at: new Date().toISOString(),
                }, { onConflict: 'user_id,record_type,period_start,period_end' });

                if (upsertErr) {
                    console.error(`[HIRA] upsert 실패 (${row.record_type}):`, upsertErr.message, upsertErr.code);
                    saveStatus.push({ record_type: row.record_type, saved: false, count: row.records.length, error: upsertErr.message });
                } else {
                    saveStatus.push({ record_type: row.record_type, saved: true, count: row.records.length });
                }
            }
        } catch (saveErr) {
            // 예외 — 사용자 흐름은 막지 않되, 응답에 명확히 노출.
            console.error('[HIRA] user_medical_records upsert 예외:', (saveErr as Error).message);
            saveStatus.push({ record_type: 'unknown', saved: false, count: 0, error: (saveErr as Error).message });
        }

        // 진단용: 받은 응답 + 보낸 기간 요약 로그
        console.log('[HIRA] 응답 요약:', {
            queryType,
            effectiveQueryType,
            sentRange: `${params.startDate || '(default)'} ~ ${params.endDate || '(default)'}`,
            savedRange: `${periodStart} ~ ${periodEnd}`,
            medicalCount: result.medical?.count ?? null,
            carCount: result.carInsurance?.count ?? null,
            medicineCount: result.myMedicine?.count ?? null,
            saveStatus,
        });

        return NextResponse.json({
            success: true,
            ...result,
            // UI가 누적 저장 결과를 사용자에게 보여주기 위해 동봉.
            saveStatus,
            savedPeriod: { start: periodStart, end: periodEnd },
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
            'CF-13001': '심평원에서 조회 가능한 기간을 벗어났습니다. 잠시 후 다시 시도해주세요. (계속 발생 시 고객센터로 문의해주세요)',
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
