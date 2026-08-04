'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Plus, Users, X, Check, CheckCheck, UserPlus, Hash } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Profile = { id: string; full_name: string; avatar_url: string; email?: string };
type Room = {
    id: string; name: string; is_group: boolean; family_id: string;
    last_message?: { content: string; created_at: string; user_id: string };
    members: Profile[];
    unread: number;
};

const MEMBER_COLORS = [
    'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-violet-600',
    'bg-teal-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600',
];

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ayer';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays < 7) return format(d, 'EEEE', { locale: es });
    return format(d, 'dd/MM/yy');
}

function GroupAvatarStack({ members, userId }: { members: Profile[]; userId: string }) {
    const others = members.filter(m => m.id !== userId).slice(0, 3);
    if (others.length === 0) return (
        <div className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-br from-[#1a5c2e] to-[#2d8a4e] flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
        </div>
    );
    if (others.length === 1) return (
        <Avatar className="h-[52px] w-[52px] rounded-2xl">
            <AvatarImage src={others[0].avatar_url} className="rounded-2xl" />
            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#1a5c2e] to-[#2d8a4e] text-white text-lg font-medium">
                {others[0].full_name?.slice(0, 1)?.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
    return (
        <div className="relative h-[52px] w-[52px] flex-shrink-0">
            <Avatar className="h-8 w-8 absolute top-0 left-0 ring-2 ring-background z-10">
                <AvatarImage src={others[0]?.avatar_url} />
                <AvatarFallback className={`${MEMBER_COLORS[0]} text-white text-[10px] font-bold`}>
                    {others[0]?.full_name?.slice(0, 1)?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 absolute bottom-0 right-0 ring-2 ring-background">
                <AvatarImage src={others[1]?.avatar_url} />
                <AvatarFallback className={`${MEMBER_COLORS[1]} text-white text-[10px] font-bold`}>
                    {others[1]?.full_name?.slice(0, 1)?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            {others.length > 2 && (
                <div className="absolute bottom-0 left-0 h-4 w-4 rounded-full bg-slate-500 text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-background z-20">
                    +{members.length - 2}
                </div>
            )}
        </div>
    );
}

export default function ChatListPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [step, setStep] = useState<'members' | 'name'>('members');

    useEffect(() => { if (user) init(); }, [user]);

    const init = async () => {
        const { data: fId } = await supabase.rpc('resolve_current_family_id');
        if (!fId) { setLoading(false); return; }
        setFamilyId(fId);
        await Promise.all([fetchRooms(fId), fetchFamilyMembers(fId)]);
        setLoading(false);
    };

    const fetchFamilyMembers = async (fId: string) => {
        const { data: owner } = await supabase.from('families').select('owner_id').eq('id', fId).single();
        const { data: members } = await supabase.from('family_members').select('user_id').eq('family_id', fId).eq('status', 'active').not('user_id', 'is', null);
        const ids = new Set<string>();
        if (owner?.owner_id) ids.add(owner.owner_id);
        if (members) members.forEach(m => { if (m.user_id) ids.add(m.user_id); });
        if (ids.size === 0) return;
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', Array.from(ids));
        if (profs) {
            const list: Profile[] = [];
            const map: Record<string, Profile> = {};
            profs.forEach((p: any) => {
                const prof = { id: p.id, full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url, email: p.email };
                list.push(prof);
                map[p.id] = prof;
            });
            setFamilyMembers(list);
            setProfiles(map);
        }
    };

    const fetchRooms = async (fId: string) => {
        const { data: myRoomMemberships } = await supabase.from('chat_room_members').select('room_id').eq('user_id', user!.id);
        if (!myRoomMemberships || myRoomMemberships.length === 0) { setRooms([]); return; }
        const roomIds = myRoomMemberships.map(m => m.room_id);

        const { data: roomData } = await supabase.from('chat_rooms').select('id, name, is_group, family_id').in('id', roomIds);
        if (!roomData) { setRooms([]); return; }

        const { data: allMembers } = await supabase.from('chat_room_members').select('room_id, user_id').in('room_id', roomIds);
        const memberIds = new Set<string>();
        if (allMembers) allMembers.forEach(m => memberIds.add(m.user_id));
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', Array.from(memberIds));
        const profMap: Record<string, Profile> = {};
        if (profs) profs.forEach((p: any) => { profMap[p.id] = { id: p.id, full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url }; });

        const lastSeenKey = `quioba_chat_last_seen_${user!.id}`;
        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem(lastSeenKey) || new Date(0).toISOString() : new Date(0).toISOString();

        const roomList: Room[] = [];
        for (const r of roomData) {
            const { data: lastMsg } = await supabase.from('family_messages').select('content, created_at, user_id').eq('room_id', r.id).order('created_at', { ascending: false }).limit(1);
            const { count } = await supabase.from('family_messages').select('*', { count: 'exact', head: true }).eq('room_id', r.id).neq('user_id', user!.id).gt('created_at', lastSeen);
            const roomMembers = allMembers?.filter(m => m.room_id === r.id).map(m => profMap[m.user_id]).filter(Boolean) || [];

            roomList.push({
                id: r.id, name: r.name, is_group: r.is_group, family_id: r.family_id,
                last_message: lastMsg?.[0] || undefined,
                members: roomMembers,
                unread: count || 0,
            });
        }

        roomList.sort((a, b) => {
            const aTime = a.last_message?.created_at || '0';
            const bTime = b.last_message?.created_at || '0';
            return bTime.localeCompare(aTime);
        });

        setRooms(roomList);
    };

    const getRoomDisplayName = (room: Room) => {
        if (room.is_group) return room.name || 'Grupo';
        const other = room.members.find(m => m.id !== user?.id);
        return other?.full_name || room.name || 'Chat';
    };

    const getMembersPreview = (room: Room) => {
        if (!room.is_group) return '';
        const names = room.members.filter(m => m.id !== user?.id).map(m => m.full_name?.split(' ')[0] || '?');
        if (names.length === 0) return 'Tú';
        return 'Tú, ' + names.join(', ');
    };

    const getLastMessagePreview = (room: Room) => {
        if (!room.last_message) return 'Aún sin mensajes';
        const isMine = room.last_message.user_id === user?.id;
        const senderName = isMine ? '' : (profiles[room.last_message.user_id]?.full_name?.split(' ')[0] + ': ' || '');
        const text = room.last_message.content;
        const truncated = text.length > 35 ? text.slice(0, 35) + '…' : text;
        return { isMine, text: senderName + truncated };
    };

    const toggleMember = (id: string) => {
        setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleNext = () => {
        if (selectedMembers.length > 1) {
            setStep('name');
        } else {
            createRoom();
        }
    };

    const resetModal = () => {
        setShowCreate(false);
        setSelectedMembers([]);
        setGroupName('');
        setStep('members');
    };

    const createRoom = async () => {
        if (!user || !familyId || selectedMembers.length === 0) return;
        setCreating(true);

        const allMembers = [user.id, ...selectedMembers];
        const isGroup = allMembers.length > 2;

        if (!isGroup) {
            const existingRooms = rooms.filter(r => !r.is_group);
            const existingDM = existingRooms.find(r => {
                const memberIds = r.members.map(m => m.id);
                return memberIds.includes(selectedMembers[0]) && memberIds.includes(user.id) && memberIds.length === 2;
            });
            if (existingDM) {
                router.push(`/apps/mi-hogar/chat/${existingDM.id}`);
                setCreating(false); resetModal();
                return;
            }
        }

        const name = isGroup ? (groupName.trim() || allMembers.map(id => profiles[id]?.full_name?.split(' ')[0] || 'Usuario').join(', ')) : '';
        const { data: newRoom, error } = await supabase.from('chat_rooms').insert({ family_id: familyId, name, is_group: isGroup, created_by: user.id }).select('id').single();
        if (error || !newRoom) { setCreating(false); return; }

        const memberRows = allMembers.map(uid => ({ room_id: newRoom.id, user_id: uid }));
        await supabase.from('chat_room_members').insert(memberRows);

        setCreating(false); resetModal();
        router.push(`/apps/mi-hogar/chat/${newRoom.id}`);
    };

    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a5c2e] to-[#2d8a4e] flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-white" />
                        </div>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-1.5 border-2 border-transparent border-t-[#1a5c2e] rounded-[18px]"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto bg-background">
            {/* Header */}
            <div className="px-4 pt-5 pb-2 bg-background/80 backdrop-blur-xl sticky top-0 z-10 border-b border-border/30">
                <div className="flex items-center justify-between mb-1">
                    <Link href="/apps/mi-hogar">
                        <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 -ml-1">
                            <ArrowLeft className="h-[18px] w-[18px] text-foreground" />
                        </button>
                    </Link>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                    >
                        <Plus className="h-5 w-5 text-[#1a5c2e]" strokeWidth={2} />
                    </button>
                </div>
                <h1 className="text-[26px] font-bold tracking-tight text-foreground px-0.5 pb-1">Chats</h1>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto">
                {rooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-10">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <MessageCircle className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-base font-semibold text-foreground mb-1">Sin conversaciones</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Toca <Plus className="w-3.5 h-3.5 inline text-[#1a5c2e]" /> para chatear con tu familia
                        </p>
                    </div>
                )}

                {rooms.map((room, i) => {
                    const preview = getLastMessagePreview(room);
                    const previewObj = typeof preview === 'string' ? { isMine: false, text: preview } : preview;
                    const hasUnread = room.unread > 0;

                    return (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                        >
                            <Link
                                href={`/apps/mi-hogar/chat/${room.id}`}
                                className="flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                            >
                                {room.is_group ? (
                                    <GroupAvatarStack members={room.members} userId={user.id} />
                                ) : (
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="h-[52px] w-[52px]">
                                            <AvatarImage src={room.members.find(m => m.id !== user.id)?.avatar_url} />
                                            <AvatarFallback className="bg-gradient-to-br from-[#1a5c2e] to-[#2d8a4e] text-white text-lg font-semibold">
                                                {getRoomDisplayName(room).slice(0, 1).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 border-b border-border/30 pb-3">
                                    <div className="flex items-baseline justify-between">
                                        <p className={`text-[15px] truncate ${hasUnread ? 'font-bold' : 'font-semibold'} text-foreground`}>
                                            {getRoomDisplayName(room)}
                                        </p>
                                        <span className={`text-[11px] ml-3 flex-shrink-0 ${hasUnread ? 'text-[#1a5c2e] font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {room.last_message ? formatTime(room.last_message.created_at) : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            {previewObj.isMine && (
                                                <CheckCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            )}
                                            <p className={`text-[13.5px] truncate ${hasUnread ? 'text-foreground font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {previewObj.isMine ? room.last_message?.content?.slice(0, 40) + (room.last_message?.content && room.last_message.content.length > 40 ? '...' : '') : previewObj.text}
                                            </p>
                                        </div>
                                        {hasUnread && (
                                            <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-[#1a5c2e] text-white text-[11px] font-bold px-1.5 flex-shrink-0">
                                                {room.unread > 99 ? '99+' : room.unread}
                                            </span>
                                        )}
                                    </div>

                                    {room.is_group && (
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{getMembersPreview(room)}</p>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* Create Chat Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
                        onClick={resetModal}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-background w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            </div>

                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-2">
                                    {step === 'name' && (
                                        <button onClick={() => setStep('members')} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div>
                                        <h2 className="text-base font-bold">{step === 'members' ? 'Nueva conversación' : 'Nombre del grupo'}</h2>
                                        {step === 'members' && <p className="text-[11px] text-muted-foreground">Selecciona quién participará</p>}
                                    </div>
                                </div>
                                <button onClick={resetModal} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 'members' ? (
                                    <motion.div key="members" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                        {/* Selected chips */}
                                        {selectedMembers.length > 0 && (
                                            <div className="px-5 pb-3">
                                                <div className="flex gap-2 flex-wrap">
                                                    {selectedMembers.map(id => {
                                                        const m = familyMembers.find(fm => fm.id === id);
                                                        if (!m) return null;
                                                        return (
                                                            <motion.button
                                                                key={id}
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                exit={{ scale: 0 }}
                                                                onClick={() => toggleMember(id)}
                                                                className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-[#1a5c2e]/10 border border-[#1a5c2e]/20 hover:bg-[#1a5c2e]/20 transition-colors"
                                                            >
                                                                <Avatar className="h-5 w-5">
                                                                    <AvatarImage src={m.avatar_url} />
                                                                    <AvatarFallback className="bg-[#1a5c2e] text-white text-[8px]">{m.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs font-medium text-[#1a5c2e]">{m.full_name?.split(' ')[0]}</span>
                                                                <X className="h-3 w-3 text-[#1a5c2e]/60" />
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Member list */}
                                        <div className="px-3 pb-3 overflow-y-auto max-h-[50vh]">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Miembros de tu familia</p>
                                            {familyMembers.filter(m => m.id !== user?.id).map(member => {
                                                const selected = selectedMembers.includes(member.id);
                                                return (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => toggleMember(member.id)}
                                                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${selected ? 'bg-[#1a5c2e]/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                    >
                                                        <div className="relative">
                                                            <Avatar className="h-11 w-11 rounded-xl">
                                                                <AvatarImage src={member.avatar_url} className="rounded-xl" />
                                                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-foreground text-sm font-bold">
                                                                    {member.full_name?.slice(0, 1)?.toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {selected && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-md bg-[#1a5c2e] flex items-center justify-center ring-2 ring-background"
                                                                >
                                                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                                                            {member.email && <p className="text-[11px] text-muted-foreground">{member.email}</p>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Action */}
                                        <div className="p-4 pt-2 border-t border-border/50">
                                            <button
                                                onClick={handleNext}
                                                disabled={selectedMembers.length === 0 || creating}
                                                className="w-full h-12 rounded-2xl bg-[#1a5c2e] text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1e7a3a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {creating ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : selectedMembers.length > 1 ? (
                                                    <>
                                                        <Users className="h-4 w-4" />
                                                        Siguiente — Crear grupo
                                                    </>
                                                ) : selectedMembers.length === 1 ? (
                                                    <>
                                                        <MessageCircle className="h-4 w-4" />
                                                        Iniciar conversación
                                                    </>
                                                ) : (
                                                    'Selecciona al menos una persona'
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        <div className="px-5 pb-4">
                                            {/* Group icon + name */}
                                            <div className="flex flex-col items-center py-6">
                                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1a5c2e] to-[#2d8a4e] flex items-center justify-center mb-4 shadow-lg shadow-[#1a5c2e]/20">
                                                    <Users className="h-8 w-8 text-white" />
                                                </div>
                                                <Input
                                                    value={groupName}
                                                    onChange={e => setGroupName(e.target.value)}
                                                    placeholder="Nombre del grupo"
                                                    className="text-center text-lg font-semibold h-12 border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-[#1a5c2e] bg-transparent placeholder:text-muted-foreground/50"
                                                    autoFocus
                                                />
                                                <p className="text-[11px] text-muted-foreground mt-2">Puedes cambiarlo después</p>
                                            </div>

                                            {/* Participants preview */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                    {selectedMembers.length + 1} participantes
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border/50">
                                                        <div className="w-5 h-5 rounded-md bg-[#1a5c2e] text-white text-[9px] font-bold flex items-center justify-center">
                                                            {profiles[user.id]?.full_name?.slice(0, 1)?.toUpperCase() || 'T'}
                                                        </div>
                                                        <span className="text-xs font-medium">Tú</span>
                                                    </div>
                                                    {selectedMembers.map(id => {
                                                        const m = familyMembers.find(fm => fm.id === id);
                                                        if (!m) return null;
                                                        return (
                                                            <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border/50">
                                                                <Avatar className="h-5 w-5 rounded-md">
                                                                    <AvatarImage src={m.avatar_url} className="rounded-md" />
                                                                    <AvatarFallback className="rounded-md bg-slate-200 dark:bg-slate-700 text-[9px] font-bold">{m.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs font-medium">{m.full_name?.split(' ')[0]}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Create */}
                                        <div className="p-4 pt-2 border-t border-border/50">
                                            <button
                                                onClick={createRoom}
                                                disabled={creating}
                                                className="w-full h-12 rounded-2xl bg-[#1a5c2e] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#1e7a3a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {creating ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4" strokeWidth={2.5} />
                                                        Crear grupo
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
