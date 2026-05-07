// app/api/risk-report/send-kakao/route.ts
// 질병 위험도 리포트를 카카오 알림톡으로 고객에게 발송.
//
// 템플릿:
//   - UH_6832 (BOBI_RISK_LINK)    : 링크 전송형
//   - UH_6833 (BOBI_RISK_SUMMARY) : 요약 전송형

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendAlimtalk, isValidKoreanPhone, normalizePhone } from '@/lib/aligo/client';
import { issueShareToken } from '@/lib/share/token';
import { getTemplateCode, isTemplateApproved } from '@/lib/aligo/templates';

export type SendTemplate = 'LINK' | 'SUMMARY';

interface SendInput {
    /** analyses.id — 위험도 리포트가 저장된 분석 행 ID */
    resourceId: string;
    template: SendTemplate;
    receiverPhone?: string;
    receiverName?: string;
    ttlDays?: number;
}

interface RiskReportShape {
    riskItems?: Array<{
        riskDisease?: string;
        relativeRisk?: number;
        evidenceLevel?: string;
        riskCategory?: string;
    }>;
    overallAssessment?: string;
}

function buildLinkMessage(customerName: string, agentName: string): string {
    return [
        `[보비] ${customerName}님의 질병 위험도 리포트가 도착했습니다.`,
        `설계사: ${agentName}`,
        ``,
        `진료 내역과 건강검진 데이터를 기반으로 위험도 분석이 완료되었습니다.`,
        `아래 버튼을 눌러 리포트를 확인해주세요.`,
        ``,
        `링크 유효: 발송일로부터 7일`,
    ].join('\n');
}

function summarizeRisk(report: RiskReportShape | null) {
    const items = (report?.riskItems || []).slice().sort((a, b) => (b.relativeRisk || 0) - (a.relativeRisk || 0));
    const top = items.slice(0, 3).map((r) => r.riskDisease).filter((n): n is string => !!n);
    const maxRisk = items.length > 0 ? Math.max(...items.map((r) => r.relativeRisk || 1)) : 1;
    // 근거수준은 가장 위험도 높은 항목의 evidenceLevel
    const evidenceLevel = items[0]?.evidenceLevel || 'B';
    // 권장 점검은 위험도 2배 이상 항목 수 기반
    const highCount = items.filter((r) => (r.relativeRisk || 0) >= 2.0).length;
    const recommendation = highCount >= 3 ? '정기 종합검진 강력 권장'
        : highCount >= 1 ? '관련 전문의 상담 권장'
            : '연 1회 정기 검진';
    return {
        topDiseases: top.length > 0 ? top.join(', ') : '특이사항 없음',
        maxRiskMultiplier: maxRisk.toFixed(1),
        evidenceLevel,
        recommendation,
    };
}

function buildSummaryMessage(report: RiskReportShape | null, customerName: string, agentName: string): string {
    const s = summarizeRisk(report);
    return [
        `[보비] ${customerName}님 위험도 리포트 요약`,
        `────────────────`,
        `주의 질환: ${s.topDiseases}`,
        `일반 대비 위험: ${s.maxRiskMultiplier}배`,
        `근거 수준: ${s.evidenceLevel}`,
        `권장 점검: ${s.recommendation}`,
        `────────────────`,
        `상세 리포트는 설계사 ${agentName}에게 문의해주세요.`,
    ].join('\n');
}

function isAligoTemplateNotApprovedError(msg: string): boolean {
    const m = msg.toLowerCase();
    return m.includes('template') && (m.includes('not') || m.includes('미') || m.includes('승인') || m.includes('검수'));
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let body: SendInput;
    try {
        body = (await request.json()) as SendInput;
    } catch {
        return NextResponse.json({ error: '요청 본문 파싱 실패' }, { status: 400 });
    }
    const { resourceId, template, receiverPhone, receiverName, ttlDays } = body;
    if (!resourceId || !template) {
        return NextResponse.json({ error: 'resourceId, template이 필요합니다.' }, { status: 400 });
    }

    const tplKind = template === 'LINK' ? 'risk_link' : 'risk_summary';
    if (!isTemplateApproved(tplKind)) {
        return NextResponse.json({
            ok: false,
            template,
            pending: true,
            pendingMessage: '카카오 측 알림톡 템플릿 검수가 완료되면 자동으로 발송이 활성화됩니다. 영업일 기준 3~5일 소요됩니다.',
        });
    }

    try {
        const svc = await createServiceClient();
        const { data: analysis, error: analysisErr } = await svc
            .from('analyses')
            .select('id, user_id, customer_id, risk_report')
            .eq('id', resourceId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (analysisErr || !analysis) {
            return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
        }
        if (!analysis.risk_report) {
            return NextResponse.json({ error: '위험도 리포트가 아직 생성되지 않았습니다.' }, { status: 400 });
        }
        const riskReport = analysis.risk_report as RiskReportShape;

        const { data: customer } = await svc
            .from('customers')
            .select('name, phone')
            .eq('id', analysis.customer_id)
            .maybeSingle();
        const customerName = customer?.name || '고객';
        const targetPhone = normalizePhone(receiverPhone || customer?.phone || '');
        if (!isValidKoreanPhone(targetPhone)) {
            return NextResponse.json({ error: '유효한 수신자 휴대폰 번호가 필요합니다.' }, { status: 400 });
        }

        const { data: profile } = await svc
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();
        const agentName =
            (profile as { name?: string } | null)?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email || '').split('@')[0] ||
            '담당 설계사';

        if (template === 'LINK') {
            const tplCode = getTemplateCode('risk_link');
            const ttlSec = Math.max(1, Math.min(30, Number(ttlDays) || 7)) * 24 * 60 * 60;
            const token = issueShareToken({
                kind: 'risk-report', resourceId: analysis.id, userId: user.id, ttlSec,
            });
            const baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                request.headers.get('origin') ||
                'https://www.bobi.co.kr';
            const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/risk-report/${token}`;
            const message = buildLinkMessage(customerName, agentName);

            try {
                const aligoResult = await sendAlimtalk({
                    templateCode: tplCode,
                    receiverPhone: targetPhone,
                    receiverName,
                    subject: `${customerName}님 위험도 리포트`,
                    message,
                    buttons: [
                        { name: '리포트 보기', linkType: 'WL', linkM: shareUrl, linkP: shareUrl },
                    ],
                    failoverToSms: true,
                });
                return NextResponse.json({ ok: true, template, shareUrl, aligo: aligoResult });
            } catch (err) {
                const msg = (err as Error).message || '';
                if (isAligoTemplateNotApprovedError(msg)) {
                    return NextResponse.json({
                        ok: false, template, pending: true,
                        pendingMessage: '템플릿이 아직 카카오 검수를 통과하지 않아 발송할 수 없습니다.',
                    });
                }
                throw err;
            }
        }

        const tplCode = getTemplateCode('risk_summary');
        const message = buildSummaryMessage(riskReport, customerName, agentName);
        try {
            const aligoResult = await sendAlimtalk({
                templateCode: tplCode,
                receiverPhone: targetPhone,
                receiverName,
                subject: `${customerName}님 위험도 요약`,
                message,
                failoverToSms: true,
            });
            return NextResponse.json({ ok: true, template, aligo: aligoResult });
        } catch (err) {
            const msg = (err as Error).message || '';
            if (isAligoTemplateNotApprovedError(msg)) {
                return NextResponse.json({
                    ok: false, template, pending: true,
                    pendingMessage: '템플릿이 아직 카카오 검수를 통과하지 않아 발송할 수 없습니다.',
                });
            }
            throw err;
        }
    } catch (err) {
        const msg = (err as Error).message || '';
        const { captureError } = await import('@/lib/monitoring/sentry-helpers');
        captureError(err, {
            area: 'alimtalk',
            level: 'error',
            tags: { provider: 'aligo', kind: 'risk-report' },
        });
        return NextResponse.json({ error: `알림톡 발송 실패: ${msg}` }, { status: 500 });
    }
}
