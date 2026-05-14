// app/api/cron/crm-notifications/route.ts
//
// 매일 새벽(KST 09:00, UTC 0시) Vercel cron이 실행. 활성 유료 사용자의 고객 중
// 오늘 알림 트리거에 해당하는 케이스를 찾아 알림톡 발송.
//
// 트리거:
//   - renewal: D-30 / D-7 / D-Day  (Basic 이상)
//   - exemption_end: D-3 / D-Day   (Pro 이상)
//   - reduction_end: D-7 / D-Day   (Pro 이상)
//   - birthday: D-Day              (Pro 이상)
//
// 중복 발송 방지: crm_notifications(customer_id, kind, trigger_label) UNIQUE.
// 같은 트리거가 같은 고객에게 한 번만 발송됨. 사용자가 날짜를 수정해도 동일 라벨이면 1회.
//
// 알림톡 템플릿 4종이 검수 통과 전이면 ALIGO가 거절 → notification 로그에는 실패 기록만.
// 통과 후 ENV (SOLAPI_TPL_CRM_*) 설정 + 재배포하면 자동 활성화.

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAlimtalk, isValidKoreanPhone, normalizePhone } from '@/lib/solapi/client';
import { getTemplateId, isTemplateApproved, type TemplateKind } from '@/lib/solapi/templates';

// CRM feature gate. plan.features 키가 명시되어 있으면 그 값을 우선,
// 없으면 slug 기반 fallback (Basic+ → renewal_notify, Pro+ → full).
const BASIC_PLUS_SLUGS = new Set(['basic', 'pro', 'team_basic', 'team_pro']);
const PRO_PLUS_SLUGS = new Set(['pro', 'team_pro']);

function checkCrmFeature(
    plan: { slug?: string; features?: Record<string, boolean> | null } | null,
    key: 'crm_renewal_notify' | 'crm_full',
): boolean {
    if (!plan) return false;
    const features = plan.features || {};
    const val = features[key];
    if (val !== undefined) return val === true;
    if (key === 'crm_full') return PRO_PLUS_SLUGS.has(plan.slug || '');
    return BASIC_PLUS_SLUGS.has(plan.slug || '');
}

type Trigger =
    | { kind: 'renewal'; label: string; templateKind: 'crm_renewal' }
    | { kind: 'exemption_end'; label: string; templateKind: 'crm_exemption_end' }
    | { kind: 'reduction_end'; label: string; templateKind: 'crm_reduction_end' }
    | { kind: 'birthday'; label: string; templateKind: 'crm_birthday' };

interface CustomerRow {
    id: string;
    user_id: string;
    name: string;
    phone: string | null;
    birth_date: string | null;
    insurer: string | null;
    product_name: string | null;
    enrollment_date: string | null;
    exemption_end_date: string | null;
    reduction_end_date: string | null;
    renewal_date: string | null;
}

function todayKstIso(): string {
    // KST = UTC+9
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
}

function dDayLabel(targetIso: string | null, todayIso: string): number | null {
    if (!targetIso) return null;
    const t = new Date(targetIso + 'T00:00:00Z').getTime();
    const today = new Date(todayIso + 'T00:00:00Z').getTime();
    return Math.round((t - today) / (1000 * 60 * 60 * 24));
}

function birthdayMatchesToday(birthDate: string | null, todayIso: string): boolean {
    if (!birthDate) return false;
    return birthDate.slice(5) === todayIso.slice(5);
}

// 잔여일 계산 (D-Day는 "오늘", 그 외는 "N일")
function remainingDays(label: string): string {
    if (label === 'D-DAY') return '오늘';
    const m = label.match(/^D-(\d+)$/);
    return m ? `${m[1]}일` : label;
}

function buildMessage(trigger: Trigger, customer: CustomerRow, agentName: string): string {
    const { name, insurer, product_name, renewal_date, exemption_end_date, reduction_end_date } = customer;
    const product = [insurer, product_name].filter(Boolean).join(' ') || '가입 보험';
    const left = remainingDays(trigger.label);
    const SEP = '────────────────';

    if (trigger.kind === 'renewal') {
        return [
            `[보비] ${name}님, ${product} 갱신일 안내`,
            SEP,
            `갱신일: ${renewal_date || '-'}`,
            `잔여: ${left} (${trigger.label})`,
            ``,
            `보장 점검·다른 상품 비교가 필요하시면`,
            `설계사 ${agentName}에게 편하게 연락주세요.`,
        ].join('\n');
    }
    if (trigger.kind === 'exemption_end') {
        return [
            `[보비] ${name}님, ${product} 면책 종료 안내`,
            SEP,
            `면책 종료일: ${exemption_end_date || '-'}`,
            `잔여: ${left} (${trigger.label})`,
            ``,
            `면책 종료 후엔 정상 청구가 가능합니다.`,
            `청구 절차 안내가 필요하시면`,
            `설계사 ${agentName}에게 연락주세요.`,
        ].join('\n');
    }
    if (trigger.kind === 'reduction_end') {
        return [
            `[보비] ${name}님, ${product} 감액 종료 안내`,
            SEP,
            `감액 종료일: ${reduction_end_date || '-'}`,
            `잔여: ${left} (${trigger.label})`,
            ``,
            `감액 종료 후엔 보험금이 100% 지급됩니다.`,
            `청구 절차 안내가 필요하시면`,
            `설계사 ${agentName}에게 연락주세요.`,
        ].join('\n');
    }
    // birthday
    return [
        `[보비] ${name}님, 생일을 진심으로 축하드립니다.`,
        ``,
        `건강하고 행복한 한 해 되시길 바랍니다.`,
        `설계사 ${agentName} 드림`,
    ].join('\n');
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayIso = todayKstIso();
    const svc = await createServiceClient();

    // 1) 활성 유료 사용자 + plan features 확인
    const { data: userPlans } = await svc
        .from('subscriptions')
        .select('user_id, status, plan:subscription_plans(slug, features)')
        .in('status', ['active', 'trialing']);
    const userById = new Map<string, { renewalNotify: boolean; full: boolean }>();
    for (const sub of userPlans || []) {
        const plan = (sub.plan as { slug?: string; features?: Record<string, boolean> } | null);
        if (!plan) continue;
        const renewalNotify = checkCrmFeature(plan, 'crm_renewal_notify');
        const full = checkCrmFeature(plan, 'crm_full');
        if (renewalNotify || full) {
            userById.set(sub.user_id as string, { renewalNotify, full });
        }
    }
    if (userById.size === 0) {
        return NextResponse.json({ message: '대상 사용자 없음', sent: 0 });
    }

    // 2) 해당 사용자들의 모든 customers 조회
    const { data: customers } = await svc
        .from('customers')
        .select('id, user_id, name, phone, birth_date, insurer, product_name, enrollment_date, exemption_end_date, reduction_end_date, renewal_date')
        .in('user_id', [...userById.keys()]);

    const results = { sent: 0, skipped: 0, failed: 0, pendingTemplate: 0 };
    const agentNameCache = new Map<string, string>();

    async function getAgentName(userId: string): Promise<string> {
        const cached = agentNameCache.get(userId);
        if (cached) return cached;
        const { data: profile } = await svc.from('profiles').select('name').eq('id', userId).maybeSingle();
        const name = (profile as { name?: string } | null)?.name || '담당 설계사';
        agentNameCache.set(userId, name);
        return name;
    }

    for (const c of (customers || []) as CustomerRow[]) {
        const features = userById.get(c.user_id);
        if (!features) continue;
        const phone = normalizePhone(c.phone || '');
        if (!isValidKoreanPhone(phone)) {
            results.skipped++;
            continue;
        }

        const triggers: Trigger[] = [];

        // renewal — Basic+
        if (features.renewalNotify && c.renewal_date) {
            const d = dDayLabel(c.renewal_date, todayIso);
            if (d === 30) triggers.push({ kind: 'renewal', label: 'D-30', templateKind: 'crm_renewal' });
            if (d === 7) triggers.push({ kind: 'renewal', label: 'D-7', templateKind: 'crm_renewal' });
            if (d === 0) triggers.push({ kind: 'renewal', label: 'D-DAY', templateKind: 'crm_renewal' });
        }
        // exemption_end — Pro+
        if (features.full && c.exemption_end_date) {
            const d = dDayLabel(c.exemption_end_date, todayIso);
            if (d === 3) triggers.push({ kind: 'exemption_end', label: 'D-3', templateKind: 'crm_exemption_end' });
            if (d === 0) triggers.push({ kind: 'exemption_end', label: 'D-DAY', templateKind: 'crm_exemption_end' });
        }
        // reduction_end — Pro+
        if (features.full && c.reduction_end_date) {
            const d = dDayLabel(c.reduction_end_date, todayIso);
            if (d === 7) triggers.push({ kind: 'reduction_end', label: 'D-7', templateKind: 'crm_reduction_end' });
            if (d === 0) triggers.push({ kind: 'reduction_end', label: 'D-DAY', templateKind: 'crm_reduction_end' });
        }
        // birthday — Pro+
        if (features.full && birthdayMatchesToday(c.birth_date, todayIso)) {
            triggers.push({ kind: 'birthday', label: 'D-DAY', templateKind: 'crm_birthday' });
        }

        if (triggers.length === 0) continue;

        // 중복 발송 방지: 이미 발송된 trigger 키 조회
        const { data: alreadySent } = await svc
            .from('crm_notifications')
            .select('kind, trigger_label')
            .eq('customer_id', c.id)
            .in('kind', triggers.map((t) => t.kind));
        const already = new Set((alreadySent || []).map((r) => `${r.kind}:${r.trigger_label}`));

        const agentName = await getAgentName(c.user_id);

        for (const t of triggers) {
            const key = `${t.kind}:${t.label}`;
            if (already.has(key)) continue;
            // 검수 미통과 시 발송 시도하지 않음 (비용·로그 쓰레기 방지)
            if (!isTemplateApproved(t.templateKind as TemplateKind)) {
                results.pendingTemplate++;
                continue;
            }
            const message = buildMessage(t, c, agentName);
            try {
                const r = await sendAlimtalk({
                    templateId: getTemplateId(t.templateKind as TemplateKind),
                    receiverPhone: phone,
                    smsFallbackSubject: t.kind === 'birthday' ? `${c.name}님 생일축하` : `${c.name}님 보험 알림`,
                    smsFallbackText: message,
                });
                // 솔라피 마이그레이션 후에도 aligo_* 컬럼명을 유지하면 DB 마이그레이션 비용 발생.
                // 기존 컬럼에 솔라피 ID/상태를 그대로 저장 (호환).
                await svc.from('crm_notifications').insert({
                    user_id: c.user_id,
                    customer_id: c.id,
                    kind: t.kind,
                    trigger_label: t.label,
                    target_phone: phone,
                    aligo_message_id: r.messageId,
                    aligo_status: r.statusCode,
                });
                results.sent++;
            } catch (err) {
                results.failed++;
                await svc.from('crm_notifications').insert({
                    user_id: c.user_id,
                    customer_id: c.id,
                    kind: t.kind,
                    trigger_label: t.label,
                    target_phone: phone,
                    aligo_status: 'error: ' + (err as Error).message.slice(0, 100),
                });
            }
        }
    }

    return NextResponse.json({ message: 'CRM 알림 처리 완료', date: todayIso, results });
}
