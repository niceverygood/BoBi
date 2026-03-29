'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export type AdminRole = 'super' | 'sub' | null;

export function useAdmin() {
    const [role, setRole] = useState<AdminRole>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<string | null>(null);

    // 편의 속성
    const isAdmin = role === 'super';
    const isSubAdmin = role === 'sub';
    const hasAdminAccess = role === 'super' || role === 'sub';

    useEffect(() => {
        const checkAdmin = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user?.email) {
                setLoading(false);
                return;
            }

            setEmail(user.email);

            // 총괄관리자 체크
            if ((ADMIN_EMAILS as readonly string[]).includes(user.email)) {
                setRole('super');
                setLoading(false);
                return;
            }

            // 중간관리자 체크
            const { data: subAdmin } = await supabase
                .from('sub_admins')
                .select('id, active')
                .eq('email', user.email)
                .eq('active', true)
                .maybeSingle();

            if (subAdmin) {
                setRole('sub');
            }

            setLoading(false);
        };

        checkAdmin();
    }, []);

    return { role, isAdmin, isSubAdmin, hasAdminAccess, loading, email };
}
