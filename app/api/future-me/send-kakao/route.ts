// app/api/future-me/send-kakao/route.ts
// 미래의 나 리포트를 카카오 알림톡으로 발송
//
// 템플릿:
//   - UH_0933 (future_me_link)    : 링크 전송형 (버튼 포함)
//   - UH_0934 (future_me_summary) : 요약 전송형 (수치만, 버튼 없음)

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendAlimtalk, isValidKoreanPhone, normalizePhone } from '@/lib/solapi/client';
import { getTemplateId } from '@/lib/solapi/templates';
import { issueShareToken } from '@/lib/future-me/share-token';
import type { FutureMeResult } from '@/types/future-me';

export type SendTemplate = 'A_LINK' | 'D_SUMMARY';

interface SendInput {
    /** future_me_reports.id (필수) */
    reportId: string;
    template: SendTemplate;
    /** 옵션: 직접 지정 시 customers.phone 무시 */
    receiverPhone?: string;
    receiverName?: string;
    /** 링크 만료 일수 (1-30, 기본 7) */
    ttlDays?: number;
}

function fmtMan(v: number): string {
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}억`;
    return `${Math.round(v).toLocaleString()}만`;
}

/**
 * UH_0933 (future_me_link) — 카카오 검수 통과 본문:
 *
 * [보비] #{고객명}님의 '미래의 나' 리포트가 도착했습니다.
 * 설계사: #{설계사명}
 *
 * 아래 버튼을 눌러 리포트를 확인해주세요.
 * 링크 유효: 발송일로부터 7일
 */
function buildLinkMessage(customerName: string, agentName: string): string {
    return [
        `[보비] ${customerName}님의 '미래의 나' 리포트가 도착했습니다.`,
        `설계사: ${agentName}`,
        ``,
        `아래 버튼을 눌러 리포트를 확인해주세요.`,
        `링크 유효: 발송일로부터 7일`,
    ].join('\n');
}

/**
 * UH_0934 (future_me_summary) — 카카오 검수 통과 본문:
 *
 * [보비] #{고객명}님 미래의 나 리포트 요약
 * ────────────────
 * 상위 위험 질환: #{상위질환}
 * 5년 후 가입 추정: #{인수추정}
 * 예상 보험료 배율: #{보험료배율}배
 * ────────────────
 * 시나리오별 자기부담
 * A 지금 보완: #{A자기부담}
 * B 5년 후: #{B자기부담}
 * C 안 함: #{C자기부담}
 *
 * 상세 리포트는 설계사 #{설계사명}에게 문의해주세요.
 */
function buildSummaryMessage(result: FutureMeResult, customerName: string, agentName: string): string {
    const top = result.riskSummary.slice(0, 3).map(r => r.category).join(', ') || '분석 결과 없음';
    const scenarioMap = new Map(result.scenarios.map(s => [s.type, s]));
    const a = scenarioMap.get('complement');
    const b = scenarioMap.get('delay');
    const c = scenarioMap.get('nothing');

    // 5년 후 가입 추정 — risk level 기준 휴리스틱
    const highRiskCount = result.riskSummary.filter(r => r.level === '고위험').length;
    const outcome = highRiskCount >= 2 ? '인수거절 가능성 높음'
        : highRiskCount >= 1 ? '조건부 인수'
            : '인수 가능성 높음';
    // 보험료 배율 추정 (간단)
    const premiumMul = highRiskCount >= 2 ? '1.6' : highRiskCount >= 1 ? '1.3' : '1.1';

    return [
        `[보비] ${customerName}님 미래의 나 리포트 요약`,
        `────────────────`,
        `상위 위험 질환: ${top}`,
        `5년 후 가입 추정: ${outcome}`,
        `예상 보험료 배율: ${premiumMul}배`,
        `────────────────`,
        `시나리오별 자기부담`,
        `A 지금 보완: ${fmtMan(a?.selfPayAmount ?? 0)}원`,
        `B 5년 후: ${fmtMan(b?.selfPayAmount ?? 0)}원`,
        `C 안 함: ${fmtMan(c?.selfPayAmount ?? 0)}원`,
        ``,
        `상세 리포트는 설계사 ${agentName}에게 문의해주세요.`,
    ].join('\n');
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = (await request.json()) as SendInput;
        const { reportId, template, receiverPhone, receiverName, ttlDays } = body;

        if (!reportId || !template) {
            return NextResponse.json(
                { error: 'reportId와 template이 필요합니다.' },
                { status: 400 },
            );
        }
        if (template !== 'A_LINK' && template !== 'D_SUMMARY') {
            return NextResponse.json({ error: '알 수 없는 템플릿입니다.' }, { status: 400 });
        }

        const svc = await createServiceClient();

        // 리포트 조회 + 본인 소유 검증
        const { data: report, error: reportErr } = await svc
            .from('future_me_reports')
            .select('id, user_id, customer_id, result')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (reportErr || !report) {
            return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
        }
        const result = report.result as FutureMeResult;

        // 고객 정보 조회 (휴대폰 폴백)
        const { data: customer } = await svc
            .from('customers')
            .select('name, phone')
            .eq('id', report.customer_id)
            .maybeSingle();

        const customerName = customer?.name || result.customerName || '고객';
        const targetPhone = normalizePhone(receiverPhone || customer?.phone || '');
        if (!isValidKoreanPhone(targetPhone)) {
            return NextResponse.json(
                { error: '유효한 수신자 휴대폰 번호가 필요합니다.' },
                { status: 400 },
            );
        }

        // 설계사 이름
        const { data: profile } = await svc
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
        const agentName =
            (profile as { full_name?: string } | null)?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email || '').split('@')[0] ||
            '담당 설계사';

        // 템플릿 분기 (솔라피 마이그레이션, 이종인 5/13)
        if (template === 'A_LINK') {
            const templateId = getTemplateId('future_me_link');

            const ttlSec = Math.max(1, Math.min(30, Number(ttlDays) || 7)) * 24 * 60 * 60;
            const token = issueShareToken(reportId, user.id, ttlSec);
            const baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                request.headers.get('origin') ||
                'https://www.bobi.co.kr';
            const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/future-me/${token}`;

            const message = buildLinkMessage(customerName, agentName);

            const solapiResult = await sendAlimtalk({
                templateId,
                receiverPhone: targetPhone,
                smsFallbackSubject: `${customerName}님 미래의 나 리포트`,
                smsFallbackText: message,
                buttons: [
                    { buttonName: '리포트 보기', buttonType: 'WL', linkMo: shareUrl, linkPc: shareUrl },
                ],
            });

            return NextResponse.json({ ok: true, template, shareUrl, solapi: solapiResult });
        }

        // D_SUMMARY
        const templateId = getTemplateId('future_me_summary');
        const message = buildSummaryMessage(result, customerName, agentName);

        const solapiResult = await sendAlimtalk({
            templateId,
            receiverPhone: targetPhone,
            smsFallbackSubject: `${customerName}님 리포트 요약`,
            smsFallbackText: message,
        });

        return NextResponse.json({ ok: true, template, solapi: solapiResult });
    } catch (err) {
        const msg = (err as Error).message || '';
        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
        captureError(err, {
            area: 'alimtalk',
            level: 'error',
            tags: { provider: 'solapi' },
        });
        return NextResponse.json(
            { error: `알림톡 발송 실패: ${msg}` },
            { status: 500 },
        );
    }
}
