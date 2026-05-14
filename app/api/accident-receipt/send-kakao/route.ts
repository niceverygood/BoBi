// app/api/accident-receipt/send-kakao/route.ts
// 가상영수증을 카카오 알림톡으로 발송. 영수증 payload를 virtual_receipts에 저장하고
// 그 row id로 share token을 발급한다. (accident-receipt 본 API는 즉석 생성 후 미저장
// 하므로 알림톡 발송 시점에 스냅샷 저장)
//
// 템플릿:
//   - UH_6835 (BOBI_RECEIPT_LINK)    : 링크 전송형
//   - UH_6836 (BOBI_RECEIPT_SUMMARY) : 요약 전송형

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendAlimtalk, isValidKoreanPhone, normalizePhone } from '@/lib/solapi/client';
import { issueShareToken } from '@/lib/share/token';
import { getTemplateId, isTemplateApproved } from '@/lib/solapi/templates';
import type { AccidentReceipt } from '@/types/accident-receipt';

export type SendTemplate = 'LINK' | 'SUMMARY';

interface SendInput {
    /** 영수증 payload (생성 직후 그대로 전달) */
    receipt: AccidentReceipt;
    /** 옵션: 고객 ID (저장 시 매핑) */
    customerId?: string | null;
    template: SendTemplate;
    receiverPhone?: string;
    receiverName?: string;
    /** 고객명 — receipt에 없으면 다이얼로그 입력값 사용 */
    customerName?: string;
    ttlDays?: number;
}

// 영수증의 금액 필드는 모두 "만원 단위". 검수된 본문은 "#{변수}만원" 형식이라
// 변수에는 만원 단위 숫자만 콤마 포맷으로 넣는다 ("억" 변환 ❌ — 형식 어긋남).
function fmtManAmount(manValue: number): string {
    return Math.round(manValue).toLocaleString();
}

function buildLinkMessage(customerName: string, agentName: string, diseaseName: string): string {
    return [
        `[보비] ${customerName}님의 가상 사고영수증이 도착했습니다.`,
        `설계사: ${agentName}`,
        ``,
        `${diseaseName} 발병 시 예상 의료비 시뮬레이션 결과입니다.`,
        `아래 버튼을 눌러 영수증을 확인해주세요.`,
        ``,
        `링크 유효: 발송일로부터 7일`,
    ].join('\n');
}

function buildSummaryMessage(receipt: AccidentReceipt, customerName: string, agentName: string): string {
    return [
        `[보비] ${customerName}님 가상영수증 요약`,
        `────────────────`,
        `시뮬레이션 질환: ${receipt.diseaseName}`,
        `예상 총 의료비: ${fmtManAmount(receipt.totalMedicalCost)}만원`,
        `현재 보장 추정: ${fmtManAmount(receipt.insurancePayout)}만원`,
        `자기부담 예상: ${fmtManAmount(receipt.finalAmount)}만원`,
        `────────────────`,
        `상세 영수증은 설계사 ${agentName}에게 문의해주세요.`,
    ].join('\n');
}

function isSolapiTemplateNotApprovedError(msg: string): boolean {
    const m = msg.toLowerCase();
    return (m.includes('template') || m.includes('템플릿') || m.includes('tpl'))
        && (m.includes('not') || m.includes('미') || m.includes('승인') || m.includes('검수') || m.includes('미설정'));
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
    const { receipt, customerId, template, receiverPhone, receiverName, customerName, ttlDays } = body;

    if (!receipt || !receipt.diseaseName) {
        return NextResponse.json({ error: '영수증 데이터가 필요합니다.' }, { status: 400 });
    }
    if (!template) {
        return NextResponse.json({ error: 'template이 필요합니다.' }, { status: 400 });
    }

    const tplKind = template === 'LINK' ? 'receipt_link' : 'receipt_summary';
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

        const targetPhone = normalizePhone(receiverPhone || '');
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

        const finalCustomerName = customerName?.trim() || '고객';

        // 영수증 스냅샷 저장 (LINK·SUMMARY 모두 동일 — SUMMARY도 추후 본문에 들어간 수치 검증용으로 보관)
        const { data: saved, error: saveErr } = await svc
            .from('virtual_receipts')
            .insert({
                user_id: user.id,
                customer_id: customerId || null,
                disease_name: receipt.diseaseName,
                disease_code: receipt.diseaseCode || null,
                payload: receipt as unknown as Record<string, unknown>,
            })
            .select('id')
            .single();

        if (saveErr || !saved) {
            return NextResponse.json({ error: `영수증 저장 실패: ${saveErr?.message || 'unknown'}` }, { status: 500 });
        }

        if (template === 'LINK') {
            const templateId = getTemplateId('receipt_link');
            const ttlSec = Math.max(1, Math.min(30, Number(ttlDays) || 7)) * 24 * 60 * 60;
            const token = issueShareToken({
                kind: 'accident-receipt', resourceId: saved.id, userId: user.id, ttlSec,
            });
            const baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                request.headers.get('origin') ||
                'https://www.bobi.co.kr';
            const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/accident-receipt/${token}`;
            const message = buildLinkMessage(finalCustomerName, agentName, receipt.diseaseName);

            try {
                const solapiResult = await sendAlimtalk({
                    templateId,
                    receiverPhone: targetPhone,
                    smsFallbackSubject: `${finalCustomerName}님 가상영수증`,
                    smsFallbackText: message,
                    buttons: [
                        { buttonName: '영수증 보기', buttonType: 'WL', linkMo: shareUrl, linkPc: shareUrl },
                    ],
                });
                return NextResponse.json({ ok: true, template, shareUrl, solapi: solapiResult });
            } catch (err) {
                const msg = (err as Error).message || '';
                if (isSolapiTemplateNotApprovedError(msg)) {
                    return NextResponse.json({
                        ok: false, template, pending: true,
                        pendingMessage: '템플릿이 아직 카카오 검수를 통과하지 않아 발송할 수 없습니다.',
                    });
                }
                throw err;
            }
        }

        // SUMMARY
        const templateId = getTemplateId('receipt_summary');
        const message = buildSummaryMessage(receipt, finalCustomerName, agentName);
        try {
            const solapiResult = await sendAlimtalk({
                templateId,
                receiverPhone: targetPhone,
                smsFallbackSubject: `${finalCustomerName}님 가상영수증 요약`,
                smsFallbackText: message,
            });
            return NextResponse.json({ ok: true, template, solapi: solapiResult });
        } catch (err) {
            const msg = (err as Error).message || '';
            if (isSolapiTemplateNotApprovedError(msg)) {
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
            tags: { provider: 'solapi', kind: 'accident-receipt' },
        });
        return NextResponse.json({ error: `알림톡 발송 실패: ${msg}` }, { status: 500 });
    }
}
