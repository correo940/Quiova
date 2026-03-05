'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ApiUsageInfo {
    endpoint: string;
    used: number;
    limit: number;
    remaining: number;
    isAdmin: boolean;
    loading: boolean;
}

/**
 * Hook to fetch and display the current user's API usage for an endpoint.
 * Returns used/limit/remaining, refreshable after each call.
 */
export function useApiUsage(endpoint: string): ApiUsageInfo & { refresh: () => void } {
    const [info, setInfo] = useState<ApiUsageInfo>({
        endpoint,
        used: 0,
        limit: 999,
        remaining: 999,
        isAdmin: false,
        loading: true
    });

    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'todojuntomirar@gmail.com';

    const fetchUsage = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setInfo(prev => ({ ...prev, loading: false }));
                return;
            }

            // Admin bypass
            if (user.email === ADMIN_EMAIL) {
                setInfo({ endpoint, used: 0, limit: Infinity, remaining: Infinity, isAdmin: true, loading: false });
                return;
            }

            // Check for custom user limit
            const { data: customLimitData } = await supabase
                .from('user_api_limits')
                .select('monthly_limit')
                .eq('user_id', user.id)
                .eq('endpoint', endpoint)
                .maybeSingle();

            let monthlyLimit;
            let enabled = true;

            if (customLimitData) {
                monthlyLimit = customLimitData.monthly_limit;
            } else {
                // Get global limit for this endpoint
                const { data: limitData } = await supabase
                    .from('api_limits')
                    .select('monthly_limit, enabled')
                    .eq('endpoint', endpoint)
                    .single();

                monthlyLimit = limitData?.monthly_limit || 50;
                enabled = limitData?.enabled ?? true;
            }

            if (!enabled) {
                setInfo({ endpoint, used: 0, limit: 0, remaining: 0, isAdmin: false, loading: false });
                return;
            }

            // Count usage this month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { count } = await supabase
                .from('api_usage')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('endpoint', endpoint)
                .gte('used_at', startOfMonth);

            const used = count || 0;

            setInfo({
                endpoint,
                used,
                limit: monthlyLimit,
                remaining: Math.max(0, monthlyLimit - used),
                isAdmin: false,
                loading: false
            });
        } catch (err) {
            console.error('[useApiUsage] Error:', err);
            setInfo(prev => ({ ...prev, loading: false }));
        }
    }, [endpoint, ADMIN_EMAIL]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    return { ...info, refresh: fetchUsage };
}
