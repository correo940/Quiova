import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to check if the current user is a Super Admin
 * Super Admin is determined by matching email with NEXT_PUBLIC_SUPER_ADMIN_EMAIL
 */
export function useSuperAdmin() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    const checkSuperAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsSuperAdmin(false);
                setLoading(false);
                return;
            }

            const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

            if (user.email === superAdminEmail) {
                setIsSuperAdmin(true);
            } else {
                setIsSuperAdmin(false);
            }
        } catch (error) {
            console.error('Error checking super admin status:', error);
            setIsSuperAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    return { isSuperAdmin, loading };
}
