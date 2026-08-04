'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronDown, MessageCircle, Send, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type Reaction = { emoji: string; user_id: string; user_name?: string };
type Message = {
    id: string; user_id: string; content: string; created_at: string;
    profile?: { full_name: string; avatar_url: string } | null;
    reactions?: Reaction[];
};
type Profile = { full_name: string; avatar_url: string };
type RoomInfo = { id: string; name: string; is_group: boolean; family_id: string };

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

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

function BubbleTail({ side }: { side: 'left' | 'right' }) {
    if (side === 'right') return <svg className="absolute -right-[6px] top-0 w-[10px] h-[14px]" viewBox="0 0 10 14" fill="none"><path d="M0 0C0 0 3 4 8 6C10 7 10 14 10 14H0V0Z" className="fill-[#1a5c2e]" /></svg>;
    return <svg className="absolute -left-[6px] top-0 w-[10px] h-[14px]" viewBox="0 0 10 14" fill="none"><path d="M10 0C10 0 7 4 2 6C0 7 0 14 0 14H10V0Z" className="fill-white dark:fill-slate-800" /></svg>;
}

function TypingIndicator({ name }: { name: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-2 justify-start">
            <div className="w-7 flex-shrink-0" />
            <div>
                <p className="text-[10px] text-muted-foreground ml-1 mb-0.5">{name}</p>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-2.5 relative border border-border/50 shadow-sm">
                    <BubbleTail side="left" />
                    <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(i => <motion.span key={i} className="w-[6px] h-[6px] rounded-full bg-[#1a5c2e]/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.8, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-full shadow-xl border px-2 py-1 flex gap-0.5 z-30">
            {QUICK_EMOJIS.map(emoji => <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-lg hover:scale-125 transition-transform p-0.5 active:scale-90">{emoji}</button>)}
        </motion.div>
    );
}

function ReactionBar({ reactions, onReact, userId }: { reactions: Reaction[]; onReact: (e: string) => void; userId: string }) {
    if (!reactions || reactions.length === 0) return null;
    const grouped = reactions.reduce((acc, r) => { if (!acc[r.emoji]) acc[r.emoji] = []; acc[r.emoji].push(r); return acc; }, {} as Record<string, Reaction[]>);
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(grouped).map(([emoji, users]) => (
                <button key={emoji} onClick={() => onReact(emoji)} className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${users.some(u => u.user_id === userId) ? 'bg-[#1a5c2e]/10 border-[#1a5c2e]/30' : 'bg-background border-border hover:bg-muted'}`} title={users.map(u => u.user_name || 'Usuario').join(', ')}>
                    {emoji} {users.length > 1 && <span className="text-[10px] text-muted-foreground">{users.length}</span>}
                </button>
            ))}
        </div>
    );
}

const chatBgPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a5c2e' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function ChatRoomPage() {
    const params = useParams<{ roomId: string }>();
    const roomId = params?.roomId;
    const { user } = useAuth();
    const [room, setRoom] = useState<RoomInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
    const [readTimes, setReadTimes] = useState<Record<string, string>>({});
    const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { if (user && roomId) fetchRoom(); }, [user, roomId]);

    useEffect(() => {
        if (!room || !user) return;
        fetchMessages();
        fetchReadStatus();
        markAsRead();

        const channel = supabase.channel('room_' + roomId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_messages', filter: `room_id=eq.${roomId}` }, async (payload) => {
                const msg = payload.new as any;
                let profile = profiles[msg.user_id] || null;
                if (!profile) {
                    const { data: p } = await supabase.from('profiles').select('full_name, avatar_url, email').eq('id', msg.user_id).single();
                    if (p) profile = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url };
                }
                setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, profile, reactions: [] }]);
                if (msg.user_id !== user.id) { setTypingUser(null); markAsRead(); }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => fetchReactions())
            .subscribe();

        const presenceChannel = supabase.channel('typing_room_' + roomId);
        presenceChannel
            .on('broadcast', { event: 'typing' }, ({ payload: p }) => {
                if (p.user_id === user.id) return;
                setTypingUser(p.name || 'Alguien');
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
            })
            .on('broadcast', { event: 'read' }, ({ payload: p }) => {
                if (p.user_id === user.id) return;
                setReadTimes(prev => ({ ...prev, [p.user_id]: p.read_at }));
            })
            .subscribe();

        const onlineChannel = supabase.channel('online_room_' + roomId);
        onlineChannel
            .on('presence', { event: 'sync' }, () => {
                const state = onlineChannel.presenceState();
                const online: Record<string, string> = {};
                Object.values(state).forEach((presences: any) => presences.forEach((p: any) => { online[p.user_id] = p.last_seen || new Date().toISOString(); }));
                setOnlineUsers(online);
            })
            .subscribe(async (status) => { if (status === 'SUBSCRIBED') await onlineChannel.track({ user_id: user.id, last_seen: new Date().toISOString() }); });

        const hb = setInterval(() => onlineChannel.track({ user_id: user.id, last_seen: new Date().toISOString() }), 30000);
        return () => { clearInterval(hb); supabase.removeChannel(channel); supabase.removeChannel(presenceChannel); supabase.removeChannel(onlineChannel); };
    }, [room, profiles]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUser]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (el) setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    }, []);

    const broadcastTyping = useCallback(() => {
        if (!roomId || !user) return;
        const myProf = profiles[user.id];
        supabase.channel('typing_room_' + roomId).send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, name: myProf?.full_name || 'Alguien' } });
    }, [roomId, user, profiles]);

    const markAsRead = useCallback(async () => {
        if (!room || !user) return;
        const now = new Date().toISOString();
        await supabase.from('chat_read_status').upsert({ family_id: room.family_id, user_id: user.id, last_read_at: now }, { onConflict: 'family_id,user_id' });
        supabase.channel('typing_room_' + roomId).send({ type: 'broadcast', event: 'read', payload: { user_id: user.id, read_at: now } });
    }, [room, user, roomId]);

    const fetchRoom = async () => {
        const { data } = await supabase.from('chat_rooms').select('id, name, is_group, family_id').eq('id', roomId).single();
        if (data) { setRoom(data); fetchRoomProfiles(data.id); }
    };

    const fetchRoomProfiles = async (rId: string) => {
        const { data: members } = await supabase.from('chat_room_members').select('user_id').eq('room_id', rId);
        if (!members || members.length === 0) return;
        const ids = members.map(m => m.user_id);
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', ids);
        if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p: any) => { map[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url }; });
            setProfiles(map);
        }
    };

    const fetchReadStatus = async () => {
        if (!room) return;
        const { data } = await supabase.from('chat_read_status').select('user_id, last_read_at').eq('family_id', room.family_id);
        if (data) { const map: Record<string, string> = {}; data.forEach((r: any) => { map[r.user_id] = r.last_read_at; }); setReadTimes(map); }
    };

    const fetchMessages = async () => {
        const { data } = await supabase.from('family_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200);
        if (!data || data.length === 0) { setMessages([]); return; }
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
        const profMap: Record<string, Profile> = {};
        if (profs) profs.forEach((p: any) => { profMap[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url }; });
        const msgIds = data.map((m: any) => m.id);
        const { data: reactionData } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds);
        const reactionMap: Record<string, Reaction[]> = {};
        if (reactionData) reactionData.forEach((r: any) => { if (!reactionMap[r.message_id]) reactionMap[r.message_id] = []; reactionMap[r.message_id].push({ emoji: r.emoji, user_id: r.user_id, user_name: profMap[r.user_id]?.full_name }); });
        setMessages(data.map((m: any) => ({ ...m, profile: profMap[m.user_id] || null, reactions: reactionMap[m.id] || [] })));
    };

    const fetchReactions = async () => {
        const msgIds = messages.map(m => m.id).filter(id => !id.startsWith('tmp_'));
        if (msgIds.length === 0) return;
        const { data } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds);
        if (!data) return;
        const rm: Record<string, Reaction[]> = {};
        data.forEach((r: any) => { if (!rm[r.message_id]) rm[r.message_id] = []; rm[r.message_id].push({ emoji: r.emoji, user_id: r.user_id, user_name: profiles[r.user_id]?.full_name }); });
        setMessages(prev => prev.map(m => ({ ...m, reactions: rm[m.id] || m.reactions || [] })));
    };

    const toggleReaction = async (messageId: string, emoji: string) => {
        if (!user || messageId.startsWith('tmp_')) return;
        const existing = messages.find(m => m.id === messageId)?.reactions?.find(r => r.emoji === emoji && r.user_id === user.id);
        if (existing) await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
        else await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !user || !room || sending) return;
        setSending(true); setInput('');
        const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: text, created_at: new Date().toISOString(), profile: profiles[user.id] || null, reactions: [] };
        setMessages(prev => [...prev, optimistic]);
        const { error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: text });
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setSending(false); inputRef.current?.focus();
    };

    const handleLongPressStart = (msgId: string) => { setLongPressTimer(setTimeout(() => setPickerMsgId(msgId), 400)); };
    const handleLongPressEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };

    const isMessageRead = (msg: Message) => {
        if (msg.user_id !== user?.id) return false;
        return Object.entries(readTimes).some(([uid, readAt]) => uid !== user?.id && new Date(readAt) >= new Date(msg.created_at));
    };

    const getOnlineStatus = () => {
        const others = Object.keys(onlineUsers).filter(uid => uid !== user?.id);
        if (others.length === 0) return `${Object.keys(profiles).length} miembros`;
        if (!room?.is_group && others.length > 0) return 'En línea';
        const names = others.map(uid => profiles[uid]?.full_name || 'Usuario').slice(0, 2);
        return names.join(', ') + ' en línea';
    };

    const getRoomTitle = () => {
        if (room?.is_group) return room.name || 'Grupo';
        const otherIds = Object.keys(profiles).filter(id => id !== user?.id);
        if (otherIds.length > 0) return profiles[otherIds[0]]?.full_name || 'Chat';
        return room?.name || 'Chat';
    };

    const getRoomAvatar = () => {
        if (room?.is_group) return null;
        const otherIds = Object.keys(profiles).filter(id => id !== user?.id);
        return otherIds.length > 0 ? profiles[otherIds[0]] : null;
    };

    if (!user || !room) {
        if (!user) return null;
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-[#1a5c2e] border-t-transparent rounded-full" />
            </div>
        );
    }

    const otherAvatar = getRoomAvatar();

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto relative" onClick={() => pickerMsgId && setPickerMsgId(null)}>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white sticky top-0 z-10 shadow-lg">
                <Link href="/apps/mi-hogar/chat">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="relative">
                        {otherAvatar ? (
                            <Avatar className="h-10 w-10 ring-2 ring-white/30">
                                <AvatarImage src={otherAvatar.avatar_url} />
                                <AvatarFallback className="text-sm bg-white/20 text-white">{otherAvatar.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                                <MessageCircle className="h-5 w-5 text-white" />
                            </div>
                        )}
                        {Object.keys(onlineUsers).filter(u => u !== user?.id).length > 0 && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1a5c2e]" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight truncate">{getRoomTitle()}</p>
                        <p className="text-[10px] text-white/70">
                            {typingUser ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="italic">{typingUser} escribiendo...</motion.span> : getOnlineStatus()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-1 relative" style={{ backgroundImage: chatBgPattern }}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <div className="bg-muted/50 rounded-full p-6 mb-4"><MessageCircle className="h-14 w-14 opacity-30" /></div>
                        <p className="text-sm font-medium">Sin mensajes aún</p>
                        <p className="text-xs mt-1">Envía el primer mensaje</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMine = msg.user_id === user?.id;
                    const profile = msg.profile || profiles[msg.user_id];
                    const showSep = shouldShowDateSeparator(msg.created_at, messages[i - 1]?.created_at);
                    const showAvatar = !isMine && (i === 0 || messages[i - 1]?.user_id !== msg.user_id || showSep);
                    const showMyName = isMine && (i === 0 || messages[i - 1]?.user_id !== msg.user_id || showSep);
                    const showTail = showAvatar || showMyName;
                    const read = isMessageRead(msg);
                    return (
                        <React.Fragment key={msg.id}>
                            {showSep && <div className="flex justify-center my-4"><span className="text-[10px] bg-white dark:bg-slate-800 px-4 py-1 rounded-lg text-muted-foreground capitalize shadow-sm border">{dateSeparatorLabel(msg.created_at)}</span></div>}
                            <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                {!isMine && <div className="w-7 flex-shrink-0 self-end">{showAvatar && profile && <Avatar className="h-7 w-7 ring-2 ring-background"><AvatarImage src={profile.avatar_url} /><AvatarFallback className="text-[10px] bg-[#1a5c2e] text-white">{profile.full_name?.slice(0, 1)?.toUpperCase() || '?'}</AvatarFallback></Avatar>}</div>}
                                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                                    {showMyName && <p className="text-[10px] font-medium text-[#1a5c2e] mr-2 mb-0.5 text-right">Yo</p>}
                                    {showAvatar && !isMine && profile && <p className="text-[10px] font-medium text-[#1a5c2e] ml-1 mb-0.5">{profile.full_name}</p>}
                                    <div className="relative" onTouchStart={() => handleLongPressStart(msg.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(msg.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd} onContextMenu={(e) => { e.preventDefault(); setPickerMsgId(msg.id); }}>
                                        <AnimatePresence>{pickerMsgId === msg.id && <EmojiPicker onSelect={(emoji) => toggleReaction(msg.id, emoji)} onClose={() => setPickerMsgId(null)} />}</AnimatePresence>
                                        <div className={`relative rounded-2xl px-3 py-1.5 text-sm break-words shadow-sm select-none ${isMine ? 'bg-[#1a5c2e] text-white rounded-tr-md' : 'bg-white dark:bg-slate-800 rounded-tl-md border border-border/50'}`}>
                                            {showTail && <BubbleTail side={isMine ? 'right' : 'left'} />}
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <p className={`text-[9px] mt-0.5 text-right flex items-center justify-end gap-0.5 ${isMine ? 'text-white/50' : 'text-muted-foreground'}`}>
                                                {formatMsgDate(msg.created_at)}
                                                {isMine && (read ? <CheckCheck className="h-3.5 w-3.5 text-blue-400 inline-block ml-1" /> : <CheckCheck className="h-3.5 w-3.5 text-white/40 inline-block ml-1" />)}
                                            </p>
                                        </div>
                                    </div>
                                    <ReactionBar reactions={msg.reactions || []} onReact={(emoji) => toggleReaction(msg.id, emoji)} userId={user.id} />
                                </div>
                            </motion.div>
                        </React.Fragment>
                    );
                })}
                <AnimatePresence>{typingUser && <TypingIndicator name={typingUser} />}</AnimatePresence>
                <div ref={bottomRef} />
            </div>

            <AnimatePresence>
                {showScrollBtn && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-20 right-4 z-20">
                        <Button size="icon" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full h-9 w-9 bg-white dark:bg-slate-800 text-muted-foreground shadow-lg border hover:bg-muted"><ChevronDown className="h-4 w-4" /></Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="border-t p-2 bg-background/95 backdrop-blur sticky bottom-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-end">
                    <Input ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); broadcastTyping(); }} placeholder="Escribe un mensaje..." className="flex-1 rounded-full h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-[#1a5c2e]" autoComplete="off" />
                    <Button type="submit" size="icon" disabled={!input.trim() || sending} className="rounded-full h-10 w-10 bg-[#1a5c2e] hover:bg-[#1e7a3a] shadow-md transition-transform active:scale-90"><Send className="h-4 w-4" /></Button>
                </form>
            </div>
        </div>
    );
}
