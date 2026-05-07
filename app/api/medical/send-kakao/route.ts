// app/api/medical/send-kakao/route.ts
// 진료정보 분석 결과를 카카오 알림톡으로 고객에게 발송.
//
// 템플릿:
//   - UH_6830 (BOBI_MEDICAL_LINK)    : 링크 전송형 (버튼 포함)
//   - UH_6831 (BOBI_MEDICAL_SUMMARY) : 요약 전송형 (수치만)

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendAlimtalk, isValidKoreanPhone, normalizePhone } from '@/lib/aligo/client';
import { issueShareToken } from '@/lib/share/token';
import { getTemplateCode, isTemplateApproved } from '@/lib/aligo/templates';

export type SendTemplate = 'LINK' | 'SUMMARY';

interface SendInput {
    /** analyses.id — 분석 ID */
    resourceId: string;
    template: SendTemplate;
    receiverPhone?: string;
    receiverName?: string;
    ttlDays?: number;
}

interface MedicalSummaryShape {
    diseaseSummary?: Array<{ diseaseName?: string; status?: string }>;
    items?: Array<{ details?: Array<{ medication?: string; ingredient?: string }> }>;
    overallSummary?: string;
    dataRange?: string;
}

function buildLinkMessage(customerName: string, agentName: string): string {
    return [
        `[보비] ${customerName}님의 진료정보 분석 리포트가 도착했습니다.`,
        `설계사: ${agentName}`,
        ``,
        `최근 5년 진료내역 기반 분석이 완료되었습니다.`,
        `아래 버튼을 눌러 리포트를 확인해주세요.`,
        ``,
        `링크 유효: 발송일로부터 7일`,
    ].join('\n');
}

function summarizeMedical(history: MedicalSummaryShape | null) {
    const diseases = (history?.diseaseSummary || [])
        .map((d) => d?.diseaseName)
        .filter((n): n is string => !!n);
    const meds: string[] = [];
    for (const it of history?.items || []) {
        for (const d of it?.details || []) {
            const m = d?.medication || d?.ingredient;
            if (m) meds.push(m);
        }
    }
    const uniqueDiseases = [...new Set(diseases)].slice(0, 5);
    const uniqueMeds = [...new Set(meds)].slice(0, 5);
    const visitCount = (history?.items || []).length;
    // dataRange 예: "2021-01 ~ 2026-04" 같은 형태일 수 있음
    const yearMatch = (history?.dataRange || '').match(/(\d{4})/g);
    let years = 5;
    if (yearMatch && yearMatch.length >= 2) {
        const y1 = parseInt(yearMatch[0], 10);
        const y2 = parseInt(yearMatch[yearMatch.length - 1], 10);
        if (Number.isFinite(y1) && Number.isFinite(y2)) years = Math.max(1, Math.abs(y2 - y1));
    }
    return {
        years,
        visitCount,
        topDiseases: uniqueDiseases.length > 0 ? uniqueDiseases.join(', ') : '특이사항 없음',
        topMeds: uniqueMeds.length > 0 ? uniqueMeds.join(', ') : '없음',
    };
}

function buildSummaryMessage(history: MedicalSummaryShape | null, customerName: string, agentName: string): string {
    const s = summarizeMedical(history);
    return [
        `[보비] ${customerName}님 진료정보 분석 요약`,
        `────────────────`,
        `조회 기간: 최근 ${s.years}년`,
        `총 진료 건수: ${s.visitCount}건`,
        `주요 진단: ${s.topDiseases}`,
        `복용 약물: ${s.topMeds}`,
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

    const tplKind = template === 'LINK' ? 'medical_link' : 'medical_summary';
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
            .select('id, user_id, customer_id, medical_history')
            .eq('id', resourceId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (analysisErr || !analysis) {
            return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
        }
        const medicalHistory = analysis.medical_history as MedicalSummaryShape | null;

        const { data: customer } = await svc
            .from('customers')
            .select('name, phone')
            .eq('id', analysis.customer_id)
            .maybeSingle();

        const customerName = customer?.name || '고객';
        const targetPhone = normalizePhone(receiverPhone || customer?.phone || '');
        if (!isValidKoreanPhone(targetPhone)) {
            return NextResponse.json(
                { error: '유효한 수신자 휴대폰 번호가 필요합니다.' },
                { status: 400 },
            );
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
            const tplCode = getTemplateCode('medical_link');
            const ttlSec = Math.max(1, Math.min(30, Number(ttlDays) || 7)) * 24 * 60 * 60;
            const token = issueShareToken({
                kind: 'medical', resourceId: analysis.id, userId: user.id, ttlSec,
            });
            const baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                request.headers.get('origin') ||
                'https://www.bobi.co.kr';
            const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/medical/${token}`;
            const message = buildLinkMessage(customerName, agentName);

            try {
                const aligoResult = await sendAlimtalk({
                    templateCode: tplCode,
                    receiverPhone: targetPhone,
                    receiverName,
                    subject: `${customerName}님 진료정보 리포트`,
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

        // SUMMARY
        const tplCode = getTemplateCode('medical_summary');
        const message = buildSummaryMessage(medicalHistory, customerName, agentName);
        try {
            const aligoResult = await sendAlimtalk({
                templateCode: tplCode,
                receiverPhone: targetPhone,
                receiverName,
                subject: `${customerName}님 진료정보 요약`,
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
            tags: { provider: 'aligo', kind: 'medical' },
        });
        return NextResponse.json({ error: `알림톡 발송 실패: ${msg}` }, { status: 500 });
    }
}
