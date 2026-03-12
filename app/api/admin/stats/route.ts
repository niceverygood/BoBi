// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Check admin
    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    try {
        // Get total users count
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Get total analyses count
        const { count: totalAnalyses } = await supabase
            .from('analyses')
            .select('*', { count: 'exact', head: true });

        // Get total uploads count
        const { count: totalUploads } = await supabase
            .from('uploads')
            .select('*', { count: 'exact', head: true });

        // Get total payments count (may not exist yet)
        let totalPayments = 0;
        try {
            const { count } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true });
            totalPayments = count ?? 0;
        } catch {
            // payments table may not exist yet
        }

        // Get recent users (last 10)
        const { data: recentUsersRaw } = await supabase.auth.admin.listUsers({
            perPage: 10,
            page: 1,
        });

        const recentUsers = (recentUsersRaw?.users || []).map((u) => ({
            id: u.id,
            email: u.email || '(no email)',
            created_at: u.created_at,
            plan: 'free',
        }));

        // Get recent analyses (last 10)
        const { data: recentAnalysesRaw } = await supabase
            .from('analyses')
            .select('id, user_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        const recentAnalyses = (recentAnalysesRaw || []).map((a) => ({
            id: a.id,
            user_email: a.user_id?.substring(0, 8) + '...',
            status: a.status,
            created_at: a.created_at,
        }));

        return NextResponse.json({
            totalUsers: totalUsers ?? 0,
            totalAnalyses: totalAnalyses ?? 0,
            totalUploads: totalUploads ?? 0,
            totalPayments,
            recentUsers,
            recentAnalyses,
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        return NextResponse.json({
            totalUsers: 0,
            totalAnalyses: 0,
            totalUploads: 0,
            totalPayments: 0,
            recentUsers: [],
            recentAnalyses: [],
        });
    }
}
