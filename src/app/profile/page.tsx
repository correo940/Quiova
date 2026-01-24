'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Camera, UserPlus, Star, Crown, Shield, Users, Sparkles, Wand2, RefreshCw, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [avatarSeed, setAvatarSeed] = useState('');
    const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState('');
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                // Allow mobile users to view profile (guest mode)
                const isMobile = Capacitor.isNativePlatform();

                if (!session && !isMobile) {
                    router.push('/login');
                    return;
                }
                if (session) {
                    setUser(session.user);

                    // Fetch Profile
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Error fetching profile:', profileError);
                    }
                    setProfile(profileData || {});

                    // Fetch Contacts
                    const { data: contactsData, error: contactsError } = await supabase
                        .from('contacts')
                        .select('*, contact:profiles!contact_id(*)')
                        .eq('user_id', session.user.id);

                    if (contactsError) {
                        console.error('Error fetching contacts:', contactsError);
                    } else {
                        setContacts(contactsData || []);
                    }
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        toast.success('Sesión cerrada correctamente');
    };

    const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files || e.target.files.length === 0) {
                return;
            }

            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            // Upload image
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateUserAvatar(publicUrl);
            toast.success("Foto de perfil actualizada");
        } catch (error) {
            console.error(error);
            toast.error("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        setAvatarSeed(seed);
        setGeneratedAvatarUrl(`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`);
    };

    const saveGeneratedAvatar = async () => {
        try {
            setUploading(true);
            await updateUserAvatar(generatedAvatarUrl);
            toast.success("Avatar creado y guardado");
            setIsAvatarDialogOpen(false);
        } catch (error) {
            toast.error("Error al guardar avatar");
        } finally {
            setUploading(false);
        }
    };

    const updateUserAvatar = async (url: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ custom_avatar_url: url })
            .eq('id', user.id);

        if (error) throw error;

        // Update local state
        setProfile({ ...profile, custom_avatar_url: url });

        // Force router refresh to update other components
        router.refresh();
    };

    const getSubscriptionBadge = () => {
        const tier = profile?.subscription_tier || 'free';
        switch (tier) {
            case 'premium':
                return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0 gap-1"><Crown className="w-3 h-3" /> Premium</Badge>;
            case 'family':
                return <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 gap-1"><Users className="w-3 h-3" /> Familiar</Badge>;
            default:
                return <Badge variant="secondary" className="gap-1"><Star className="w-3 h-3" /> Gratuito</Badge>;
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Sparkles className="animate-spin text-primary w-8 h-8" /></div>;
    }

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4 pb-32">
            <div className="flex flex-col items-center mb-8 gap-4">
                <div className="relative group">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-black shadow-xl ring-4 ring-primary/10">
                        <AvatarImage src={profile?.custom_avatar_url || user?.user_metadata?.avatar_url} className="object-cover" />
                        <AvatarFallback className="text-4xl">{profile?.nickname?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>

                    {/* Photo Upload */}
                    <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform z-10" title="Subir foto real">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpdateAvatar} disabled={uploading} />
                    </label>

                    {/* Create Avatar */}
                    <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="absolute bottom-0 left-0 p-2 bg-violet-600 text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform z-10"
                                title="Crear Avatar"
                                onClick={() => {
                                    generateRandomAvatar();
                                    setIsAvatarDialogOpen(true);
                                }}
                            >
                                <Wand2 className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Crear tu Avatar</DialogTitle>
                                <DialogDescription>
                                    Genera un avatar único para tu perfil.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-6 py-4">
                                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-violet-100 shadow-inner bg-slate-50">
                                    <img src={generatedAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={generateRandomAvatar} disabled={uploading}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Aleatorio
                                    </Button>
                                    <Button onClick={saveGeneratedAvatar} disabled={uploading} className="bg-violet-600 hover:bg-violet-700">
                                        <Check className="w-4 h-4 mr-2" />
                                        Guardar Avatar
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="text-center">
                    <h1 className="text-3xl font-bold">{profile?.nickname || user?.email?.split('@')[0]}</h1>
                    <p className="text-muted-foreground mb-2">{user?.email}</p>
                    {getSubscriptionBadge()}
                </div>
            </div>

            <div className="grid gap-6">
                {/* Account Status Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Estado de la Cuenta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl mb-4">
                            <div>
                                <p className="font-medium">Plan Actual</p>
                                <p className="text-sm text-muted-foreground capitalize">{profile?.subscription_tier || 'Gratuito'}</p>
                            </div>
                            <Button variant="outline" size="sm">Mejorar Plan</Button>
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión Salir de la aplicación
                        </Button>
                    </CardContent>
                </Card>

                {/* Friends / Contacts */}
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Mis Amigos
                            </CardTitle>
                            <CardDescription>Gente con la que compartes apps</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" className="gap-2">
                                    <UserPlus className="w-4 h-4" /> Añadir
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Añadir Amigo</DialogTitle>
                                    <DialogDescription>
                                        Invita a alguien a usar Quioba Apps contigo.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Email o Código de Usuario</Label>
                                        <Input placeholder="usuario@ejemplo.com" />
                                    </div>
                                    <Button className="w-full">Enviar Invitación</Button>
                                    <p className="text-xs text-muted-foreground text-center">
                                        También puedes añadir amigos directamente desde cada aplicación.
                                    </p>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {contacts.length > 0 ? (
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-2">
                                    {contacts.map((contact) => (
                                        <div key={contact.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={contact.contact?.custom_avatar_url} />
                                                    <AvatarFallback>{contact.contact?.nickname?.[0] || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{contact.contact?.nickname || 'Usuario'}</p>
                                                    <p className="text-xs text-muted-foreground">En tus contactos</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">Invitar a...</Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                                <p>No tienes amigos añadidos aún.</p>
                                <p className="text-xs mt-1">Invita a gente a tus listas o grupos.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
