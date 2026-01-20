'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { SetupWizard } from '@/components/apps/organizador-vital/setup-wizard';
import { MainDashboard } from '@/components/apps/organizador-vital/main-dashboard';

export default function OrganizadorVitalPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        async function checkProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('smart_scheduler_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error checking profile:', error);
            } finally {
                setLoading(false);
            }
        }

        checkProfile();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return <SetupWizard onComplete={(newProfile) => setProfile(newProfile)} />;
    }

    return <MainDashboard profile={profile} />;
}
