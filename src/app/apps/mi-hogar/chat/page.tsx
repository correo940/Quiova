'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Plus, Search, Users, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

    const getRoomAvatar = (room: Room) => {
        if (room.is_group) return null;
        return room.members.find(m => m.id !== user?.id) || null;
    };

    const getLastMessagePreview = (room: Room) => {
        if (!room.last_message) return 'Sin mensajes';
        const isMine = room.last_message.user_id === user?.id;
        const prefix = isMine ? 'Yo: ' : '';
        const text = room.last_message.content;
        return prefix + (text.length > 40 ? text.slice(0, 40) + '...' : text);
    };

    const getTimeLabel = (room: Room) => {
        if (!room.last_message) return '';
        return formatDistanceToNow(new Date(room.last_message.created_at), { addSuffix: false, locale: es });
    };

    const toggleMember = (id: string) => {
        setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
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
                setCreating(false); setShowCreate(false);
                return;
            }
        }

        const name = isGroup ? (groupName.trim() || allMembers.map(id => profiles[id]?.full_name || 'Usuario').join(', ')) : '';
        const { data: newRoom, error } = await supabase.from('chat_rooms').insert({ family_id: familyId, name, is_group: isGroup, created_by: user.id }).select('id').single();
        if (error || !newRoom) { setCreating(false); return; }

        const memberRows = allMembers.map(uid => ({ room_id: newRoom.id, user_id: uid }));
        await supabase.from('chat_room_members').insert(memberRows);

        setCreating(false); setShowCreate(false); setSelectedMembers([]); setGroupName('');
        router.push(`/apps/mi-hogar/chat/${newRoom.id}`);
    };

    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-[#1a5c2e] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white sticky top-0 z-10 shadow-lg">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-base font-bold">Chats</h1>
                    <p className="text-[10px] text-white/70">{rooms.length} conversacion{rooms.length !== 1 ? 'es' : ''}</p>
                </div>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto">
                {rooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                        <div className="bg-muted/50 rounded-full p-6 mb-4"><MessageCircle className="h-14 w-14 opacity-30" /></div>
                        <p className="text-sm font-medium">Sin chats aún</p>
                        <p className="text-xs mt-1 text-center">Pulsa + para iniciar una conversación</p>
                    </div>
                )}
                {rooms.map((room, i) => {
                    const avatar = getRoomAvatar(room);
                    return (
                        <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Link href={`/apps/mi-hogar/chat/${room.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted border-b border-border/30 transition-colors">
                                <div className="relative">
                                    {avatar ? (
                                        <Avatar className="h-12 w-12 ring-2 ring-border/30">
                                            <AvatarImage src={avatar.avatar_url} />
                                            <AvatarFallback className="bg-[#1a5c2e] text-white text-sm">{avatar.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-[#1a5c2e]/10 flex items-center justify-center ring-2 ring-border/30">
                                            <Users className="h-5 w-5 text-[#1a5c2e]" />
                                        </div>
                                    )}
                                    {room.unread > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-[#1a5c2e] text-white text-[10px] font-bold px-1 shadow-md">
                                            {room.unread > 99 ? '99+' : room.unread}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between">
                                        <p className={`text-sm truncate ${room.unread > 0 ? 'font-bold' : 'font-medium'}`}>{getRoomDisplayName(room)}</p>
                                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{getTimeLabel(room)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className={`text-xs truncate ${room.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{getLastMessagePreview(room)}</p>
                                    </div>
                                    {room.is_group && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{room.members.length} miembros</p>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* FAB New Chat */}
            <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setShowCreate(true)}
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#1a5c2e] text-white shadow-xl flex items-center justify-center z-20 hover:bg-[#1e7a3a] transition-colors"
            >
                <Plus className="h-6 w-6" />
            </motion.button>

            {/* Create Chat Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => { setShowCreate(false); setSelectedMembers([]); setGroupName(''); }}>
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#1a5c2e] text-white rounded-t-2xl">
                                <h2 className="text-sm font-bold">Nuevo chat</h2>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => { setShowCreate(false); setSelectedMembers([]); setGroupName(''); }}><X className="h-4 w-4" /></Button>
                            </div>

                            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                                <p className="text-xs text-muted-foreground font-medium">Selecciona participantes</p>
                                {familyMembers.filter(m => m.id !== user?.id).map(member => (
                                    <button key={member.id} onClick={() => toggleMember(member.id)} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-colors ${selectedMembers.includes(member.id) ? 'bg-[#1a5c2e]/10 ring-1 ring-[#1a5c2e]/30' : 'hover:bg-muted'}`}>
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback className="bg-[#1a5c2e] text-white text-xs">{member.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-medium">{member.full_name}</p>
                                            {member.email && <p className="text-[10px] text-muted-foreground">{member.email}</p>}
                                        </div>
                                        {selectedMembers.includes(member.id) && (
                                            <div className="w-6 h-6 rounded-full bg-[#1a5c2e] flex items-center justify-center"><Check className="h-3.5 w-3.5 text-white" /></div>
                                        )}
                                    </button>
                                ))}

                                {selectedMembers.length > 1 && (
                                    <div className="pt-2">
                                        <p className="text-xs text-muted-foreground font-medium mb-1">Nombre del grupo (opcional)</p>
                                        <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ej: Familia, Padres..." className="h-9 text-sm rounded-lg" />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t">
                                <Button onClick={createRoom} disabled={selectedMembers.length === 0 || creating} className="w-full bg-[#1a5c2e] hover:bg-[#1e7a3a] rounded-xl h-11">
                                    {creating ? 'Creando...' : selectedMembers.length > 1 ? 'Crear grupo' : 'Iniciar chat'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
