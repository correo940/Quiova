'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type Message = {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profile?: { full_name: string; avatar_url: string } | null;
};

type Profile = { full_name: string; avatar_url: string };

function formatMsgDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ayer ' + format(d, 'HH:mm');
    return format(d, "d MMM HH:mm", { locale: es });
}

function shouldShowDateSeparator(current: string, prev?: string) {
    if (!prev) return true;
    return new Date(current).toDateString() !== new Date(prev).toDateString();
}

function dateSeparatorLabel(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Hoy';
    if (isYesterday(d)) return 'Ayer';
    return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export default function FamilyChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        fetchFamilyId();
    }, [user]);

    useEffect(() => {
        if (!familyId) return;
        fetchMessages();

        const channel = supabase
            .channel('family_chat_' + familyId)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'family_messages',
                filter: `family_id=eq.${familyId}`,
            }, async (payload) => {
                const msg = payload.new as any;
                let profile = profiles[msg.user_id] || null;
                if (!profile) {
                    const { data: p } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', msg.user_id)
                        .single();
                    if (p) profile = p;
                }
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, { ...msg, profile }];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [familyId, profiles]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchFamilyId = async () => {
        const { data } = await supabase.rpc('resolve_current_family_id');
        if (data) {
            setFamilyId(data);
            fetchProfiles(data);
        }
    };

    const fetchProfiles = async (fId: string) => {
        const { data: owner } = await supabase
            .from('families')
            .select('owner_id')
            .eq('id', fId)
            .single();

        const { data: members } = await supabase
            .from('family_members')
            .select('user_id')
            .eq('family_id', fId)
            .eq('status', 'active')
            .not('user_id', 'is', null);

        const userIds = new Set<string>();
        if (owner?.owner_id) userIds.add(owner.owner_id);
        if (members) members.forEach(m => { if (m.user_id) userIds.add(m.user_id); });

        if (userIds.size === 0) return;

        const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(userIds));

        if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p: any) => { map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
            setProfiles(map);
        }
    };

    const fetchMessages = async () => {
        if (!familyId) return;
        const { data } = await supabase
            .from('family_messages')
            .select('*')
            .eq('family_id', familyId)
            .order('created_at', { ascending: true })
            .limit(200);

        if (!data || data.length === 0) { setMessages([]); return; }

        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const profMap: Record<string, Profile> = {};
        if (profs) profs.forEach((p: any) => { profMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });

        setMessages(data.map((m: any) => ({ ...m, profile: profMap[m.user_id] || null })));
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !user || !familyId || sending) return;

        setSending(true);
        setInput('');

        const optimistic: Message = {
            id: 'tmp_' + Date.now(),
            user_id: user.id,
            content: text,
            created_at: new Date().toISOString(),
            profile: profiles[user.id] || null,
        };
        setMessages(prev => [...prev, optimistic]);

        const { error } = await supabase
            .from('family_messages')
            .insert({ family_id: familyId, user_id: user.id, content: text });

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        }
        setSending(false);
        inputRef.current?.focus();
    };

    if (!user || !familyId) {
        if (!user) return null;
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <p className="text-sm text-muted-foreground">Cargando chat...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-[#1a5c2e] flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight">Chat familiar</p>
                        <p className="text-[10px] text-muted-foreground">{Object.keys(profiles).length} miembros</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                        <p className="text-sm">Sin mensajes aún</p>
                        <p className="text-xs">Envía el primer mensaje a tu familia</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMine = msg.user_id === user?.id;
                    const profile = msg.profile || profiles[msg.user_id];
                    const showSeparator = shouldShowDateSeparator(msg.created_at, messages[i - 1]?.created_at);
                    const showAvatar = !isMine && (i === 0 || messages[i - 1]?.user_id !== msg.user_id || showSeparator);

                    return (
                        <React.Fragment key={msg.id}>
                            {showSeparator && (
                                <div className="flex justify-center my-3">
                                    <span className="text-[10px] bg-muted px-3 py-0.5 rounded-full text-muted-foreground capitalize">
                                        {dateSeparatorLabel(msg.created_at)}
                                    </span>
                                </div>
                            )}
                            <div className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                {!isMine && (
                                    <div className="w-7 flex-shrink-0">
                                        {showAvatar && profile && (
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={profile.avatar_url} />
                                                <AvatarFallback className="text-[10px] bg-[#1a5c2e] text-white">
                                                    {profile.full_name?.slice(0, 1)?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                )}
                                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                                    {showAvatar && !isMine && profile && (
                                        <p className="text-[10px] text-muted-foreground ml-1 mb-0.5">{profile.full_name}</p>
                                    )}
                                    <div className={`rounded-2xl px-3 py-1.5 text-sm break-words ${
                                        isMine
                                            ? 'bg-[#1a5c2e] text-white rounded-br-md'
                                            : 'bg-muted rounded-bl-md'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        <p className={`text-[9px] mt-0.5 text-right ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                                            {formatMsgDate(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-2 bg-background sticky bottom-0">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 rounded-full h-10"
                            autoComplete="off"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || sending}
                            className="rounded-full h-10 w-10 bg-[#1a5c2e] hover:bg-[#1e7a3a]"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
        </div>
    );
}
