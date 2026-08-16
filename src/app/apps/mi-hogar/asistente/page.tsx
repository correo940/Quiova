'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppPermission } from '@/hooks/useAppPermission';
import ChatInterface from '@/components/apps/asistente/chat-interface';

export default function AsistentePage() {
    const router = useRouter();
    const { level: permLevel, loading: permLoading } = useAppPermission('mi-hogar.asistente');
    const readOnly = permLevel === 'view';
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);

                    // Get profile name
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', user.id)
                        .single();

                    if (profile?.full_name) {
                        setUserName(profile.full_name.split(' ')[0]); // First name only
                    }
                }
            } catch (error) {
                console.error('Error getting user:', error);
            } finally {
                setLoading(false);
            }
        };

        getUser();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/5 rounded-2xl">
                        <Bot className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2 text-center">
                        <div className="h-4 w-40 bg-slate-200/60 rounded-lg animate-pulse mx-auto" />
                        <div className="h-3 w-24 bg-slate-200/40 rounded animate-pulse mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    if (!permLoading && permLevel === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <Card className="p-8 max-w-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-bold mb-1">No tienes acceso a esta app</h2>
                    <p className="text-sm text-muted-foreground">Pide al propietario de la familia que te conceda acceso al Asistente.</p>
                </Card>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
                <Bot className="w-16 h-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Asistente Quioba</h1>
                <p className="text-muted-foreground text-center">
                    Necesitas iniciar sesión para usar el asistente.
                </p>
                <Link href="/apps/mi-hogar/login">
                    <Button>Iniciar sesión</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Back button for mobile */}
            <div className="md:hidden flex items-center gap-2 p-2 border-b bg-background">
                <Button variant="ghost" size="icon" onClick={() => router.push('/desktop')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <span className="font-medium">Asistente</span>
            </div>

            <div className="flex-1 overflow-hidden">
                <ChatInterface userId={userId} userName={userName} readOnly={readOnly} />
            </div>
        </div>
    );
}
