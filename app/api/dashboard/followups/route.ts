// app/api/dashboard/followups/route.ts
// 팔로업 필요 고객 리스트 — 설계사가 매일 확인해야 할 액션 카드
//
// 3가지 케이스 감지:
//   A. 분석 후 7일 이상 경과, 위험도 리포트 미생성 → "위험도 리포트 만들기"
//   B. 위험도 리포트 있으나 미래의나 미생성 → "미래의나 리포트 생성"
//   C. 미래의나 생성 후 7일 경과, 카톡 발송 이력 없음 → "카톡으로 전달"
//
// 각 고객 1회씩만 노출 (가장 우선순위 높은 액션 1개)

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export type FollowupType = 'need_risk_report' | 'need_future_me' | 'need_send' | 'stale';

export interface FollowupItem {
    customerId: string | null;
    customerName: string;
    analysisId: string;
    type: FollowupType;
    daysSince: number;
    actionLabel: string;
    actionHref: string;
    message: string;
}

function daysBetween(date: string): number {
    const d = new Date(date).getTime();
    return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const svc = await createServiceClient();

        // 완료된 분석 + 고객 정보 조인
        const { data: analyses } = await svc
            .from('analyses')
            .select('id, customer_id, created_at, risk_report, updated_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .not('customer_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!analyses || analyses.length === 0) {
            return NextResponse.json({ followups: [] });
        }

        // 고객 이름 매핑
        const customerIds = [...new Set(analyses.map(a => a.customer_id).filter(Boolean))] as string[];
        const { data: customers } = await svc
            .from('customers')
            .select('id, name')
            .in('id', customerIds);
        const customerMap = new Map((customers || []).map(c => [c.id, c.name]));

        // future_me_reports 조회 (analysis_id 또는 customer_id 기준)
        const { data: fmReports } = await svc
            .from('future_me_reports')
            .select('id, customer_id, created_at')
            .eq('user_id', user.id)
            .in('customer_id', customerIds);
        const futureMeMap = new Map<string, { id: string; created_at: string }>();
        for (const r of fmReports || []) {
            // 같은 고객이면 가장 최신만 기록
            const existing = futureMeMap.get(r.customer_id);
            if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
                futureMeMap.set(r.customer_id, { id: r.id, created_at: r.created_at });
            }
        }

        // 각 분석별 팔로업 타입 판정
        const items: FollowupItem[] = [];
        const seenCustomers = new Set<string>();

        for (const a of analyses) {
            if (!a.customer_id || seenCustomers.has(a.customer_id)) continue;

            const name = customerMap.get(a.customer_id) || '알 수 없는 고객';
            const daysSince = daysBetween(a.created_at);
            const fm = futureMeMap.get(a.customer_id);

            // Case A: 분석 완료, 위험도 리포트 없음 + 7일 이상
            if (!a.risk_report && daysSince >= 7) {
                items.push({
                    customerId: a.customer_id,
                    customerName: name,
                    analysisId: a.id,
                    type: 'need_risk_report',
                    daysSince,
                    actionLabel: '위험도 리포트 생성',
                    actionHref: `/dashboard/risk-report?analysisId=${a.id}`,
                    message: `${daysSince}일 전 분석 완료 · 위험도 리포트 미생성`,
                });
                seenCustomers.add(a.customer_id);
                continue;
            }

            // Case B: 위험도 리포트 있으나 미래의나 없음
            if (a.risk_report && !fm && daysSince >= 3) {
                items.push({
                    customerId: a.customer_id,
                    customerName: name,
                    analysisId: a.id,
                    type: 'need_future_me',
                    daysSince,
                    actionLabel: '미래의 나 리포트 생성',
                    actionHref: `/dashboard/future-me?customerId=${a.customer_id}`,
                    message: `${daysSince}일 전 위험도 리포트 완료 · 미래의나 미생성`,
                });
                seenCustomers.add(a.customer_id);
                continue;
            }

            // Case C: 미래의나 생성 후 7일 경과
            if (fm) {
                const fmDays = daysBetween(fm.created_at);
                if (fmDays >= 7) {
                    items.push({
                        customerId: a.customer_id,
                        customerName: name,
                        analysisId: a.id,
                        type: 'need_send',
                        daysSince: fmDays,
                        actionLabel: '고객에게 공유',
                        actionHref: `/dashboard/future-me?customerId=${a.customer_id}`,
                        message: `${fmDays}일 전 미래의나 생성 · 고객 공유 내역 없음`,
                    });
                    seenCustomers.add(a.customer_id);
                    continue;
                }
            }

            // Case D: 분석 후 30일 이상 아무 활동 없음 (완전 방치)
            if (daysSince >= 30) {
                items.push({
                    customerId: a.customer_id,
                    customerName: name,
                    analysisId: a.id,
                    type: 'stale',
                    daysSince,
                    actionLabel: '고객 카드 보기',
                    actionHref: `/dashboard/customers/${a.customer_id}`,
                    message: `${daysSince}일간 아무 활동 없음 · 재연락 필요`,
                });
                seenCustomers.add(a.customer_id);
            }
        }

        // 우선순위: need_send > need_future_me > need_risk_report > stale
        const priority: Record<FollowupType, number> = {
            need_send: 0,
            need_future_me: 1,
            need_risk_report: 2,
            stale: 3,
        };
        items.sort((a, b) => priority[a.type] - priority[b.type] || b.daysSince - a.daysSince);

        return NextResponse.json({ followups: items.slice(0, 10) });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || 'followups 조회 실패' },
            { status: 500 },
        );
    }
}
