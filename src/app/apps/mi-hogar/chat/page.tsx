'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Plus, Users, X, Check, CheckCheck, Search, MoreVertical, Camera } from 'lucide-react';
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
        <div className="h-[50px] w-[50px] rounded-full bg-[#1a5c2e] flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
        </div>
    );
    if (others.length === 1) return (
        <Avatar className="h-[50px] w-[50px]">
            <AvatarImage src={others[0].avatar_url} />
            <AvatarFallback className="bg-[#2d5a3e] text-white text-lg font-medium">{others[0].full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
        </Avatar>
    );
    return (
        <div className="relative h-[50px] w-[50px] flex-shrink-0">
            <Avatar className="h-[34px] w-[34px] absolute top-0 left-0 ring-2 ring-white dark:ring-[#0f1612] z-10">
                <AvatarImage src={others[0]?.avatar_url} />
                <AvatarFallback className="bg-[#2d5a3e] text-white text-[10px] font-bold">{others[0]?.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <Avatar className="h-[34px] w-[34px] absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#0f1612]">
                <AvatarImage src={others[1]?.avatar_url} />
                <AvatarFallback className="bg-[#3a6b4a] text-white text-[10px] font-bold">{others[1]?.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {others.length > 2 && (
                <div className="absolute bottom-0 left-0 h-[18px] w-[18px] rounded-full bg-[#133f21] text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0f1612] z-20">
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
            roomList.push({ id: r.id, name: r.name, is_group: r.is_group, family_id: r.family_id, last_message: lastMsg?.[0] || undefined, members: roomMembers, unread: count || 0 });
        }
        roomList.sort((a, b) => { const aTime = a.last_message?.created_at || '0'; const bTime = b.last_message?.created_at || '0'; return bTime.localeCompare(aTime); });
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
        const sender = profiles[room.last_message.user_id];
        const senderName = isMine ? 'Tú' : (sender?.full_name?.split(' ')[0] || '');
        const text = room.last_message.content || 'Nota de voz';
        const truncated = text.length > 50 ? text.slice(0, 50) + '…' : text;
        return { isMine, senderName, text: truncated };
    };

    const toggleMember = (id: string) => {
        setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleNext = () => {
        if (selectedMembers.length > 1) setStep('name');
        else createRoom();
    };

    const resetModal = () => { setShowCreate(false); setSelectedMembers([]); setGroupName(''); setStep('members'); };

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
            if (existingDM) { router.push(`/apps/mi-hogar/chat/${existingDM.id}`); setCreating(false); resetModal(); return; }
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-white/80 border-t-transparent rounded-full" />
            </div>
        );
    }

    const getMemberAvatars = (room: Room) => {
        return room.members.filter(m => m.id !== user?.id).slice(0, 4);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto bg-[#f4f1ec] dark:bg-[#0f1612]">
            {/* ===== QUIOBA HEADER ===== */}
            <div className="bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white sticky top-0 z-10 shadow-md">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Link href="/apps/mi-hogar" className="p-1">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-[20px] font-semibold tracking-tight">Chats familiares</h1>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button className="p-2 rounded-full hover:bg-white/10"><Search className="h-5 w-5" /></button>
                        <button className="p-2 rounded-full hover:bg-white/10"><MoreVertical className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {/* FAB button */}
            <button
                onClick={() => setShowCreate(true)}
                className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-2xl bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform hover:from-[#1e7a3a] hover:to-[#22884a]"
            >
                <MessageCircle className="h-6 w-6" />
            </button>

            {/* Room Cards */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                {rooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-10">
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-[#1a5c2e]/10 flex items-center justify-center mb-4 shadow-sm">
                            <MessageCircle className="h-9 w-9 text-[#1a5c2e]/40" />
                        </div>
                        <p className="text-[16px] font-normal text-[#6b7b6e] dark:text-[#8a9b8e]">
                            Toca el botón para iniciar un chat con tu familia
                        </p>
                    </div>
                )}

                {rooms.map((room) => {
                    const preview = getLastMessagePreview(room);
                    const previewObj = typeof preview === 'string' ? { isMine: false, senderName: '', text: preview } : preview;
                    const hasUnread = room.unread > 0;
                    const memberAvatars = getMemberAvatars(room);

                    return (
                        <Link key={room.id} href={`/apps/mi-hogar/chat/${room.id}`}
                            className={`block rounded-2xl bg-white dark:bg-[#1a2a1e] shadow-sm border overflow-hidden transition-all active:scale-[0.98] hover:shadow-md ${hasUnread ? 'border-[#1a5c2e]/25 ring-1 ring-[#1a5c2e]/10' : 'border-[#e9ebe6] dark:border-[#1e3324]'}`}
                        >
                            {/* Card header: title + time + unread */}
                            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasUnread ? 'bg-[#1a5c2e]' : 'bg-transparent'}`} />
                                    <h3 className="text-[17px] font-semibold text-[#1a2318] dark:text-[#e0e8e2] truncate">
                                        {getRoomDisplayName(room)}
                                    </h3>
                                    {room.is_group && (
                                        <span className="text-[10px] font-medium text-[#1a5c2e] bg-[#1a5c2e]/8 dark:bg-[#1a5c2e]/20 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                            Grupo
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {hasUnread && (
                                        <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#1a5c2e] text-white text-[11px] font-bold px-1.5">
                                            {room.unread > 99 ? '99+' : room.unread}
                                        </span>
                                    )}
                                    <span className={`text-[12px] ${hasUnread ? 'text-[#1a5c2e] font-medium' : 'text-[#6b7b6e] dark:text-[#8a9b8e]'}`}>
                                        {room.last_message ? formatTime(room.last_message.created_at) : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Last message preview */}
                            <div className="px-4 pb-2">
                                <div className="flex items-center gap-1.5">
                                    {previewObj.isMine && (
                                        <CheckCheck className="h-[15px] w-[15px] text-[#c8a23c] flex-shrink-0" />
                                    )}
                                    <p className="text-[13.5px] text-[#6b7b6e] dark:text-[#8a9b8e] truncate">
                                        {previewObj.senderName ? <span className="font-medium text-[#4a5a4e] dark:text-[#a0b0a4]">{previewObj.senderName}: </span> : null}
                                        {previewObj.text}
                                    </p>
                                </div>
                            </div>

                            {/* Members strip */}
                            <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-t border-[#f0ede8] dark:border-[#1e3324]">
                                <div className="flex -space-x-2">
                                    {memberAvatars.map((member) => (
                                        <Avatar key={member.id} className="h-7 w-7 ring-2 ring-white dark:ring-[#1a2a1e]">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback className="bg-[#2d5a3e] text-white text-[9px] font-bold">
                                                {member.full_name?.slice(0, 1)?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <p className="text-[12px] text-[#8a9b8e] dark:text-[#6b7b6e] truncate">
                                    {getMembersPreview(room)}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* ===== Create Chat Modal ===== */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                        onClick={resetModal}
                    >
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white dark:bg-[#162018] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-[#6b7b6e]/30" />
                            </div>

                            {/* Modal Header — Quioba green */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white">
                                <div className="flex items-center gap-3">
                                    {step === 'name' && (
                                        <button onClick={() => setStep('members')} className="p-1 rounded-full hover:bg-white/10">
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                    )}
                                    <div>
                                        <h2 className="text-[17px] font-medium">{step === 'members' ? 'Nueva conversación' : 'Nombre del grupo'}</h2>
                                        {step === 'members' && <p className="text-[12px] text-white/70">Selecciona participantes</p>}
                                    </div>
                                </div>
                                <button onClick={resetModal} className="p-1.5 rounded-full hover:bg-white/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 'members' ? (
                                    <motion.div key="members" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                        {/* Selected chips */}
                                        {selectedMembers.length > 0 && (
                                            <div className="px-4 pt-3 pb-2 border-b border-[#e9ebe6] dark:border-[#1e2a20]">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {selectedMembers.map(id => {
                                                        const m = familyMembers.find(fm => fm.id === id);
                                                        if (!m) return null;
                                                        return (
                                                            <motion.button key={id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => toggleMember(id)}
                                                                className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-[#e4f0d8] dark:bg-[#1a3322]/50 border border-[#1a5c2e]/20"
                                                            >
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={m.avatar_url} />
                                                                    <AvatarFallback className="bg-[#1a5c2e] text-white text-[8px] font-bold">{m.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-[12px] font-medium text-[#1a2318] dark:text-[#e0e8e2]">{m.full_name?.split(' ')[0]}</span>
                                                                <X className="h-3 w-3 text-[#6b7b6e]" />
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Member list */}
                                        <div className="overflow-y-auto max-h-[50vh]">
                                            <p className="text-[12px] font-medium text-[#6b7b6e] uppercase tracking-wider px-4 pt-4 pb-2">Miembros de tu familia</p>
                                            {familyMembers.filter(m => m.id !== user?.id).map(member => {
                                                const selected = selectedMembers.includes(member.id);
                                                return (
                                                    <button key={member.id} onClick={() => toggleMember(member.id)}
                                                        className="flex items-center gap-3.5 w-full px-4 py-2 hover:bg-[#f4f1ec] dark:hover:bg-[#1a2a1e] transition-colors"
                                                    >
                                                        <div className="relative">
                                                            <Avatar className="h-[42px] w-[42px]">
                                                                <AvatarImage src={member.avatar_url} />
                                                                <AvatarFallback className="bg-[#2d5a3e] text-white text-sm font-medium">{member.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            {selected && (
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                                    className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-[#1a5c2e] flex items-center justify-center ring-2 ring-white dark:ring-[#162018]"
                                                                >
                                                                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left border-b border-[#e9ebe6] dark:border-[#1e2a20] py-1.5">
                                                            <p className="text-[15px] text-[#1a2318] dark:text-[#e0e8e2]">{member.full_name}</p>
                                                            {member.email && <p className="text-[12px] text-[#6b7b6e] dark:text-[#8a9b8e]">{member.email}</p>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Action */}
                                        <div className="p-4 pt-2 border-t border-[#e9ebe6] dark:border-[#1e2a20]">
                                            <button onClick={handleNext} disabled={selectedMembers.length === 0 || creating}
                                                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white font-medium text-[15px] disabled:opacity-40 hover:from-[#1e7a3a] hover:to-[#22884a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {creating ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : selectedMembers.length > 1 ? (
                                                    <><Users className="h-4 w-4" /> Siguiente</>
                                                ) : selectedMembers.length === 1 ? (
                                                    <><MessageCircle className="h-4 w-4" /> Iniciar chat</>
                                                ) : 'Selecciona al menos una persona'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        <div className="px-5 pb-4">
                                            <div className="flex flex-col items-center py-8">
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] flex items-center justify-center mb-5">
                                                    <Users className="h-9 w-9 text-white" />
                                                </div>
                                                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Nombre del grupo"
                                                    className="text-center text-lg h-12 border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-[#1a5c2e] bg-transparent placeholder:text-[#6b7b6e] text-[#1a2318] dark:text-[#e0e8e2]"
                                                    autoFocus
                                                />
                                                <p className="text-[12px] text-[#6b7b6e] mt-2">Puedes cambiarlo después</p>
                                            </div>
                                            <div className="bg-[#f4f1ec] dark:bg-[#1a2a1e] rounded-xl p-3">
                                                <p className="text-[11px] font-medium text-[#6b7b6e] uppercase tracking-wider mb-2">{selectedMembers.length + 1} participantes</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-[#1e3324] border border-[#e9ebe6] dark:border-[#2a4a34]">
                                                        <div className="w-5 h-5 rounded-full bg-[#1a5c2e] text-white text-[9px] font-bold flex items-center justify-center">
                                                            {profiles[user.id]?.full_name?.slice(0, 1)?.toUpperCase() || 'T'}
                                                        </div>
                                                        <span className="text-[12px] font-medium text-[#1a2318] dark:text-[#e0e8e2]">Tú</span>
                                                    </div>
                                                    {selectedMembers.map(id => {
                                                        const m = familyMembers.find(fm => fm.id === id);
                                                        if (!m) return null;
                                                        return (
                                                            <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-[#1e3324] border border-[#e9ebe6] dark:border-[#2a4a34]">
                                                                <Avatar className="h-5 w-5">
                                                                    <AvatarImage src={m.avatar_url} />
                                                                    <AvatarFallback className="bg-[#2d5a3e] text-white text-[8px] font-bold">{m.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-[12px] font-medium text-[#1a2318] dark:text-[#e0e8e2]">{m.full_name?.split(' ')[0]}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 pt-2 border-t border-[#e9ebe6] dark:border-[#1e2a20]">
                                            <button onClick={createRoom} disabled={creating}
                                                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white font-medium text-[15px] disabled:opacity-40 hover:from-[#1e7a3a] hover:to-[#22884a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {creating ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (<><Check className="h-4 w-4" strokeWidth={2.5} /> Crear grupo</>)}
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
