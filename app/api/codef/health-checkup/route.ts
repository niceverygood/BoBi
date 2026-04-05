// app/api/codef/health-checkup/route.ts
// 건강보험공단 건강검진 데이터 조회 (데모 키)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchHealthCheckupResult,
    fetchHealthAge,
    fetchStrokePrediction,
    fetchCardioPrediction,
    type HealthCheckupRequest,
} from '@/lib/codef/client';

export const maxDuration = 300;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const {
            userName, identity, phoneNo,
            loginType = '5', loginTypeLevel, authMethod, telecom,
            queryType = 'all', // 'checkup' | 'age' | 'stroke' | 'cardio' | 'all'
            is2Way, twoWayInfo, simpleAuth, smsAuthNo, sessionId,
        } = body;

        if (!userName || !identity || !phoneNo) {
            return NextResponse.json({ error: '이름, 주민등록번호, 전화번호가 필요합니다.' }, { status: 400 });
        }

        const params: HealthCheckupRequest = {
            userName,
            identity: identity.replace(/-/g, ''),
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            authMethod,
            telecom,
            is2Way,
            twoWayInfo,
            simpleAuth,
            smsAuthNo,
            id: sessionId || `bobi-hc-${user.id.substring(0, 8)}-${Date.now()}`,
        };

        console.log('[HealthCheckup] Request:', { userName: userName.substring(0, 1) + '**', queryType, loginType });

        const results: Record<string, unknown> = {};
        const errors: string[] = [];

        // 건강검진결과
        if (queryType === 'all' || queryType === 'checkup') {
            try {
                const { data, requires2Way, twoWayData } = await fetchHealthCheckupResult(params);
                if (requires2Way) {
                    return NextResponse.json({
                        requires2Way: true,
                        twoWayData,
                        sessionId: params.id,
                    });
                }
                results.checkup = data;
            } catch (err) {
                errors.push(`건강검진결과: ${(err as Error).message}`);
            }
        }

        // 건강나이
        if (queryType === 'all' || queryType === 'age') {
            try {
                const { data, requires2Way, twoWayData } = await fetchHealthAge(params);
                if (requires2Way && !results.checkup) {
                    return NextResponse.json({ requires2Way: true, twoWayData, sessionId: params.id });
                }
                results.healthAge = data;
            } catch (err) {
                errors.push(`건강나이: ${(err as Error).message}`);
            }
        }

        // 뇌졸중 예측
        if (queryType === 'all' || queryType === 'stroke') {
            try {
                const { data } = await fetchStrokePrediction(params);
                results.stroke = data;
            } catch (err) {
                errors.push(`뇌졸중예측: ${(err as Error).message}`);
            }
        }

        // 심뇌혈관 예측
        if (queryType === 'all' || queryType === 'cardio') {
            try {
                const { data } = await fetchCardioPrediction(params);
                results.cardio = data;
            } catch (err) {
                errors.push(`심뇌혈관예측: ${(err as Error).message}`);
            }
        }

        if (Object.keys(results).length === 0 && errors.length > 0) {
            return NextResponse.json({
                error: `건강검진 데이터 조회 실패: ${errors.join(', ')}`,
            }, { status: 500 });
        }

        return NextResponse.json({
            results,
            errors: errors.length > 0 ? errors : undefined,
            sessionId: params.id,
        });
    } catch (error) {
        console.error('[HealthCheckup] Error:', error);
        return NextResponse.json({
            error: `건강검진 조회 중 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
