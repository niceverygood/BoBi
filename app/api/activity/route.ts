// app/api/activity/route.ts
// 유저 활동 로그 조회 — 분석, 결제, 구독 변경 등
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ActivityItem {
    id: string;
    type: 'analysis' | 'payment' | 'subscription' | 'login';
    title: string;
    description: string;
    timestamp: string;
    icon: string;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const activities: ActivityItem[] = [];

        // 분석 이력
        const { data: analyses } = await supabase
            .from('analyses')
            .select('id, status, created_at, medical_history')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        for (const a of analyses || []) {
            const mh = a.medical_history as Record<string, any> | null;
            activities.push({
                id: `analysis-${a.id}`,
                type: 'analysis',
                title: a.status === 'completed' ? '분석 완료' : '분석 진행',
                description: mh?.overallSummary?.substring(0, 50) || '고지사항 분석',
                timestamp: a.created_at,
                icon: '📋',
            });
        }

        // 결제 이력
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        for (const p of payments || []) {
            const isCancelled = p.status === 'cancelled' || p.status === 'refunded';
            activities.push({
                id: `payment-${p.id}`,
                type: 'payment',
                title: isCancelled ? '결제 취소' : '결제 완료',
                description: `${(p.amount || 0).toLocaleString()}원 · ${p.plan_slug || ''} · ${p.payment_method || ''}`,
                timestamp: p.created_at,
                icon: isCancelled ? '💸' : '💳',
            });
        }

        // 구독 변경 이력
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(display_name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        for (const s of subs || []) {
            const planName = (s.plan as any)?.display_name || s.plan_id;
            if (s.status === 'cancelled') {
                activities.push({
                    id: `sub-cancel-${s.id}`,
                    type: 'subscription',
                    title: '구독 해지',
                    description: `${planName} 플랜 해지${s.cancelled_at ? '' : ''}`,
                    timestamp: s.cancelled_at || s.updated_at || s.created_at,
                    icon: '🚫',
                });
            }
            activities.push({
                id: `sub-${s.id}`,
                type: 'subscription',
                title: '구독 시작',
                description: `${planName} 플랜 · ${s.payment_method || ''}`,
                timestamp: s.created_at,
                icon: '⭐',
            });
        }

        // 시간순 정렬
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({ activities: activities.slice(0, 30) });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
