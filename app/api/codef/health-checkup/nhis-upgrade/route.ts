// app/api/codef/health-checkup/nhis-upgrade/route.ts
//
// NHIS 공단 공식 예측(뇌졸중 or 심뇌혈관) 업그레이드 엔드포인트.
// 기본 플로우가 끝난 뒤 결과 화면에서 사용자가 선택적으로 호출.
// 타깃별로 별도 2-way 간편인증이 필요하다.
//
// POST body:
//   { target: 'stroke' | 'cardio', customerId?, userName, identity, phoneNo,
//     loginType, loginTypeLevel, telecom, is2Way?, twoWayInfo?, sessionId? }
//
// 응답:
//   - 2-way 필요 시: { requires2Way, twoWayData, sessionId }
//   - 성공: { success: true, target, data: {...NHIS 공식 결과, _source:'nhis'} }

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
    fetchStrokePrediction,
    fetchCardioPrediction,
    type HealthCheckupRequest,
} from '@/lib/codef/client';
import { getUserPlan, canAccessCodef } from '@/lib/subscription/access';

export const maxDuration = 300;

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
                    error: '건강검진 공단 업그레이드는 베이직 플랜 이상에서 이용 가능합니다.',
                    requiresPlan: 'basic',
                    feature: 'codef_nhis_upgrade',
                },
                { status: 403 },
            );
        }

        const body = await request.json();
        const {
            target,
            customerId,
            userName, identity, phoneNo,
            loginType = '5', loginTypeLevel, telecom,
            is2Way, twoWayInfo, simpleAuth, smsAuthNo, sessionId,
        } = body;

        if (target !== 'stroke' && target !== 'cardio') {
            return NextResponse.json(
                { error: "target은 'stroke' 또는 'cardio'여야 합니다." },
                { status: 400 },
            );
        }
        if (!userName || !identity || !phoneNo) {
            return NextResponse.json(
                { error: '이름, 주민등록번호, 전화번호가 필요합니다.' },
                { status: 400 },
            );
        }

        const params: HealthCheckupRequest = {
            userName,
            identity: identity.replace(/-/g, ''),
            phoneNo: phoneNo.replace(/-/g, ''),
            loginType,
            loginTypeLevel,
            telecom,
            is2Way,
            twoWayInfo,
            simpleAuth,
            smsAuthNo,
            id: sessionId || `bobi-nhis-${target}-${user.id.substring(0, 8)}-${Date.now()}`,
        };

        const fetcher = target === 'stroke' ? fetchStrokePrediction : fetchCardioPrediction;
        const result = await fetcher(params);

        if (result.requires2Way) {
            return NextResponse.json({
                requires2Way: true,
                twoWayData: result.twoWayData,
                sessionId: params.id,
            });
        }

        if (!result.data) {
            return NextResponse.json({
                error: `${target === 'stroke' ? '뇌졸중' : '심뇌혈관'} NHIS 예측 데이터를 받지 못했습니다.`,
            }, { status: 502 });
        }

        // _source 태깅 — 프롬프트 라벨 분기용
        const taggedData = {
            ...(result.data as Record<string, unknown>),
            _source: 'nhis' as const,
            _fetchedAt: new Date().toISOString(),
        };

        // 저장소 업데이트 (customerId 있을 때만)
        if (customerId) {
            try {
                const svc = await createServiceClient();
                const { data: existing } = await svc
                    .from('client_health_checkups')
                    .select('id')
                    .eq('customer_id', customerId)
                    .eq('user_id', user.id)
                    .order('checked_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existing) {
                    const column = target === 'stroke' ? 'stroke_prediction' : 'cardio_prediction';
                    await svc
                        .from('client_health_checkups')
                        .update({ [column]: taggedData })
                        .eq('id', existing.id);
                }
            } catch (err) {
                console.warn('[NhisUpgrade] 저장 실패 (non-critical):', (err as Error).message);
            }
        }

        return NextResponse.json({
            success: true,
            target,
            data: taggedData,
        });
    } catch (err) {
        console.error('[NhisUpgrade] Error:', err);
        return NextResponse.json(
            { error: (err as Error).message || '업그레이드 실패' },
            { status: 500 },
        );
    }
}
