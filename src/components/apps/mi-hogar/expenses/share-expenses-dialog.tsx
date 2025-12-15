import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Key, ShieldCheck, RefreshCw, Copy, Mail, Users, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Partner = {
    email: string;
    id: string;
    nickname?: string; // Added nickname to Partner type
};

// Assuming Invitation type might be needed for pending/sent invites, defining a basic one
type Invitation = {
    id: string;
    email: string;
    status: 'pending' | 'sent';
};

export function ShareExpensesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [loading, setLoading] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]); // Keep for legacy/cleanup
    const [sentInvites, setSentInvites] = useState<Invitation[]>([]); // Keep for legacy/cleanup
    const [partners, setPartners] = useState<Partner[]>([]);
    const [nickname, setNickname] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [inputCode, setInputCode] = useState('');

    useEffect(() => {
        if (open) {
            checkStatus();
        }
    }, [open]);

    const checkStatus = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 0. Fetch Nickname
            const { data: profile } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', user.id)
                .single();
            if (profile?.nickname) setNickname(profile.nickname);

            // 1. Check ALL partners
            const { data: partnersData, error: partnerError } = await supabase
                .from('expense_partners')
                .select('id, user_id_1, user_id_2')
                .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

            if (partnerError) throw partnerError;

            if (partnersData && partnersData.length > 0) {
                // Manual Join: extract IDs and fetch profiles
                const partnerIds = partnersData.map(p => p.user_id_1 === user.id ? p.user_id_2 : p.user_id_1);

                let profilesMap: Record<string, string> = {};

                if (partnerIds.length > 0) {
                    const { data: profiles, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, nickname')
                        .in('id', partnerIds);

                    if (!profileError && profiles) {
                        profiles.forEach(p => {
                            if (p.nickname) profilesMap[p.id] = p.nickname;
                        });
                    }
                }

                const formattedPartners = partnersData.map(p => {
                    const partnerId = p.user_id_1 === user.id ? p.user_id_2 : p.user_id_1;
                    return {
                        id: partnerId,
                        email: 'Usuario Conectado',
                        nickname: profilesMap[partnerId] || 'Usuario'
                    };
                });
                setPartners(formattedPartners);
            } else {
                setPartners([]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar el estado de vinculación.');
        } finally {
            setLoading(false);
        }
    };

    const generateCode = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('generate_connection_code');
            if (error) throw error;
            setGeneratedCode(data);
        } catch (error) {
            toast.error('Error al generar código');
        } finally {
            setLoading(false);
        }
    };

    const redeemCode = async () => {
        if (inputCode.length < 6) return toast.error('Código inválido');
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('redeem_connection_code', { p_code: inputCode });
            if (error) throw error;
            toast.success('¡Vinculación Correcta!');
            checkStatus();
            setInputCode('');
        } catch (error: any) {
            toast.error(error.message || 'Error al canjear código');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        toast.success('Código copiado');
    };

    const handleSendEmail = () => {
        const subject = "Únete a mi Hucha Común en Quiova";
        const body = `Hola, \n\nQuiero compartir gastos contigo en la app Quiova.\n\n1.Entra en la sección 'Hucha Común'.\n2.Dale a 'Compartir' -> 'Tengo un código'.\n3.Introduce este código: ${generatedCode} \n\n¡Nos vemos dentro!`;
        window.open(`mailto:? subject = ${encodeURIComponent(subject)}& body=${encodeURIComponent(body)} `);
    };

    const saveNickname = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ nickname: nickname })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Nombre actualizado');
        } catch (e) {
            toast.error('Error al guardar nombre');
        }
    };

    const handleRemovePartner = async (partnerId: string) => {
        if (!confirm('¿Seguro que quieres eliminar a este usuario de tu lista?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('remove_partner', { p_partner_id: partnerId });
            if (error) throw error;
            toast.success('Usuario eliminado');
            // Refresh list
            checkStatus();
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Vincular Hucha</DialogTitle>
                    <DialogDescription>
                        Usa un código temporal para conectar con tu pareja al instante.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Nickname Section */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                        <Label className="text-xs text-muted-foreground">Tu Nombre (Visible para el grupo)</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                placeholder="Ej: Jacho"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="h-9"
                            />
                            <Button size="sm" onClick={saveNickname}>Guardar</Button>
                        </div>
                    </div>

                    {loading && partners.length === 0 && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}

                    {/* Partners List (if any) */}
                    {partners.length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Personas Conectadas</h3>
                            </div>
                            <div className="space-y-2">
                                {partners.map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                                <Users className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{p.nickname || 'Usuario'}</p>
                                                <p className="text-xs text-muted-foreground">{p.email}</p>
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemovePartner(p.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-3 text-center">
                                Compartís gastos entre {partners.length + 1} personas.
                            </p>
                        </div>
                    )}

                    {/* Always allow adding more */}
                    <div className="space-y-6">

                        {/* Option A: Generate Code */}
                        <div className="space-y-2 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900">
                            <Label className="text-base font-semibold">Tengo que dar un código</Label>
                            <p className="text-sm text-muted-foreground mb-4">
                                Genera un código y dáselo a tu pareja para que lo introduzca.
                            </p>

                            {generatedCode ? (
                                <div className="flex flex-col items-center gap-2 animate-in fade-in">
                                    <div className="text-4xl font-mono font-bold tracking-widest text-primary my-2">
                                        {generatedCode}
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button variant="outline" className="flex-1" onClick={copyCode}>
                                            <Copy className="w-4 h-4 mr-2" /> Copiar
                                        </Button>
                                        <Button variant="outline" className="flex-1" onClick={handleSendEmail}>
                                            <Mail className="w-4 h-4 mr-2" /> Enviar Email
                                        </Button>
                                        <Button variant="ghost" onClick={generateCode}>
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Válido por 15 minutos</p>
                                </div>
                            ) : (
                                <Button onClick={generateCode} className="w-full" variant="secondary">
                                    <Key className="w-4 h-4 mr-2" /> Generar Código
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O bien</span></div>
                        </div>

                        {/* Option B: Enter Code */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Tengo un código</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ej: 123456"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="text-center font-mono text-lg tracking-widest"
                                />
                                <Button onClick={redeemCode} disabled={inputCode.length < 6}>
                                    Vincular
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
