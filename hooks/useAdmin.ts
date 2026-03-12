'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export function useAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user?.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
                setIsAdmin(true);
                setEmail(user.email);
            }
            setLoading(false);
        };

        checkAdmin();
    }, []);

    return { isAdmin, loading, email };
}
