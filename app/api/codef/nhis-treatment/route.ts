import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchNhisTreatment, type NhisTreatmentRequest } from '@/lib/codef/client';

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
            identity,
            phoneNo,
            loginType = '5',
            loginTypeLevel,
            telecom,
            startDate,
            endDate,
            is2Way,
            twoWayInfo,
            simpleAuth,
            secureNo,
            secureNoRefresh,
        } = body;

        if (!userName || !identity || !phoneNo) {
            return NextResponse.json({ error: '이름, 주민등록번호(또는 생년월일), 전화번호를 입력해주세요.' }, { status: 400 });
        }

        const sessionId = body.sessionId || `nhis-${user.id}-${Date.now()}`;

        // 건보공단 간편인증 시 identity = 생년월일(YYYYMMDD)
        const params: NhisTreatmentRequest = {
            userName,
            identity: identity.replace(/\D/g, ''),
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            telecom,
            id: sessionId,
            startDate,
            endDate,
            type: '0',
            is2Way,
            twoWayInfo,
            simpleAuth,
            secureNo,
            secureNoRefresh,
        };

        console.log('[NHIS] Request:', {
            userName: userName ? `${userName[0]}**` : 'N/A',
            loginType,
            loginTypeLevel,
            is2Way: !!is2Way,
            sessionId,
        });

        const result = await fetchNhisTreatment(params);

        if (result.requires2Way) {
            return NextResponse.json({
                requires2Way: true,
                twoWayData: result.twoWayData,
                sessionId,
            });
        }

        return NextResponse.json({
            success: true,
            records: result.records,
            count: result.records.length,
            sessionId,
        });
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('[NHIS] Error:', errorMessage);

        const codeMatch = errorMessage.match(/CF[\-\u2010\u2011\u2013\u2212](\d+)/);
        const errorCode = codeMatch ? `CF-${codeMatch[1]}` : undefined;

        return NextResponse.json({
            error: `진료/투약정보 조회 중 오류가 발생했습니다: ${errorMessage}`,
            errorCode,
        }, { status: 500 });
    }
}
