// app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // 고객 목록 + 각 고객의 최근 분석 수
        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // 고객별 분석 건수
        const { data: analyses } = await supabase
            .from('analyses')
            .select('customer_id, status, created_at, medical_history, product_eligibility, risk_report')
            .eq('user_id', user.id)
            .not('customer_id', 'is', null);

        const analysisMap = new Map<string, { count: number; lastDate: string; hasStep2: boolean; hasRisk: boolean }>();
        for (const a of analyses || []) {
            if (!a.customer_id) continue;
            const existing = analysisMap.get(a.customer_id);
            if (!existing) {
                analysisMap.set(a.customer_id, {
                    count: 1,
                    lastDate: a.created_at,
                    hasStep2: !!a.product_eligibility,
                    hasRisk: !!a.risk_report,
                });
            } else {
                existing.count++;
                if (a.created_at > existing.lastDate) existing.lastDate = a.created_at;
                if (a.product_eligibility) existing.hasStep2 = true;
                if (a.risk_report) existing.hasRisk = true;
            }
        }

        const enriched = (customers || []).map(c => ({
            ...c,
            analysisCount: analysisMap.get(c.id)?.count || 0,
            lastAnalysisDate: analysisMap.get(c.id)?.lastDate || null,
            hasStep2: analysisMap.get(c.id)?.hasStep2 || false,
            hasRiskReport: analysisMap.get(c.id)?.hasRisk || false,
        }));

        return NextResponse.json({ customers: enriched });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { name, birthDate, gender, phone, memo } = await request.json();
        if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 });

        const { data, error } = await supabase
            .from('customers')
            .insert({
                user_id: user.id,
                name,
                birth_date: birthDate || null,
                gender: gender || null,
                phone: phone || null,
                memo: memo || null,
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ customer: data });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
