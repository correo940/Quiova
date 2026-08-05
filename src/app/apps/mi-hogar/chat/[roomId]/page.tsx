'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronDown, Send, Check, CheckCheck, Reply, X, Mic, Play, Pause, Paperclip, MoreVertical, Phone } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type Reaction = { emoji: string; user_id: string; user_name?: string };
type Message = {
    id: string; user_id: string; content: string; created_at: string;
    reply_to?: string | null; media_url?: string | null;
    reply_message?: { content: string; user_id: string; profile_name?: string } | null;
    profile?: { full_name: string; avatar_url: string } | null;
    reactions?: Reaction[];
};
type Profile = { full_name: string; avatar_url: string };
type RoomInfo = { id: string; name: string; is_group: boolean; family_id: string };

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MAX_RECORD_SECONDS = 120;
const CONTACT_COLORS = ['#2d7a4a', '#8b6914', '#a0522d', '#6b4c8a', '#2e7d8c', '#8c5e3c', '#5c7a3e', '#7a3e5c'];

function formatMsgTime(dateStr: string) { return format(new Date(dateStr), 'HH:mm'); }
function shouldShowDateSep(current: string, prev?: string) { if (!prev) return true; return new Date(current).toDateString() !== new Date(prev).toDateString(); }
function dateSepLabel(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Hoy';
    if (isYesterday(d)) return 'Ayer';
    return format(d, "d 'de' MMMM", { locale: es });
}
function formatDuration(s: number) { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; }
function getContactColor(userId: string) { let hash = 0; for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash); return CONTACT_COLORS[Math.abs(hash) % CONTACT_COLORS.length]; }

function AudioPlayer({ url, isMine }: { url: string; isMine: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    useEffect(() => {
        const audio = audioRef.current; if (!audio) return;
        const onLoaded = () => setDuration(audio.duration || 0);
        const onTime = () => setCurrentTime(audio.currentTime);
        const onEnded = () => { setPlaying(false); setCurrentTime(0); };
        audio.addEventListener('loadedmetadata', onLoaded); audio.addEventListener('timeupdate', onTime); audio.addEventListener('ended', onEnded);
        return () => { audio.removeEventListener('loadedmetadata', onLoaded); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded); };
    }, []);
    const toggle = () => { const audio = audioRef.current; if (!audio) return; if (playing) audio.pause(); else audio.play(); setPlaying(!playing); };
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    return (
        <div className="flex items-center gap-2 min-w-[200px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            <button onClick={toggle} className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-[#1a5c2e]/15' : 'bg-[#1a5c2e]/10'}`}>
                {playing ? <Pause className="h-5 w-5 text-[#1a5c2e]" /> : <Play className="h-5 w-5 ml-0.5 text-[#1a5c2e]" />}
            </button>
            <div className="flex-1 min-w-0">
                <div className="relative h-[4px] rounded-full overflow-hidden bg-black/10">
                    <div className="h-full rounded-full bg-[#1a5c2e] transition-all duration-100" style={{ width: `${progress}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#1a5c2e] shadow-sm transition-all duration-100" style={{ left: `calc(${progress}% - 6px)` }} />
                </div>
                <p className="text-[11px] mt-1 text-black/35 tabular-nums">{playing || currentTime > 0 ? formatDuration(currentTime) : (duration > 0 ? formatDuration(duration) : '0:00')}</p>
            </div>
        </div>
    );
}

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
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [recording, setRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const profilesRef = useRef(profiles);
    profilesRef.current = profiles;
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const addIncomingMessage = useCallback(async (msg: any) => {
        const currentProfiles = profilesRef.current;
        let profile = currentProfiles[msg.user_id] || null;
        if (!profile) {
            const { data: p } = await supabase.from('profiles').select('full_name, avatar_url, email').eq('id', msg.user_id).single();
            if (p) profile = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url };
        }
        let reply_message = null;
        if (msg.reply_to) {
            const replied = messagesRef.current.find(m => m.id === msg.reply_to);
            if (replied) reply_message = { content: replied.content, user_id: replied.user_id, profile_name: replied.profile?.full_name || currentProfiles[replied.user_id]?.full_name };
        }
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const withoutOptimistic = msg.user_id === user?.id ? prev.filter(m => !(m.id.startsWith('tmp_') && m.content === msg.content && m.user_id === msg.user_id)) : prev;
            return [...withoutOptimistic, { ...msg, profile, reactions: [], reply_message }];
        });
        if (msg.user_id !== user?.id) { setTypingUser(null); markAsRead(); }
    }, [user]);

    useEffect(() => { if (user && roomId) fetchRoom(); }, [user, roomId]);

    useEffect(() => {
        if (!room || !user) return;
        fetchMessages(); fetchReadStatus(); markAsRead();
        const channel = supabase.channel('room_' + roomId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_messages', filter: `room_id=eq.${roomId}` }, (payload) => { addIncomingMessage(payload.new); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
                const msgIds = messagesRef.current.map(m => m.id).filter(id => !id.startsWith('tmp_'));
                if (msgIds.length === 0) return;
                supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds).then(({ data }) => {
                    if (!data) return;
                    const rm: Record<string, Reaction[]> = {};
                    data.forEach((r: any) => { if (!rm[r.message_id]) rm[r.message_id] = []; rm[r.message_id].push({ emoji: r.emoji, user_id: r.user_id, user_name: profilesRef.current[r.user_id]?.full_name }); });
                    setMessages(prev => prev.map(m => ({ ...m, reactions: rm[m.id] || m.reactions || [] })));
                });
            }).subscribe();
        const presenceChannel = supabase.channel('typing_room_' + roomId);
        broadcastChannelRef.current = presenceChannel;
        presenceChannel
            .on('broadcast', { event: 'typing' }, ({ payload: p }) => { if (p.user_id === user.id) return; setTypingUser(p.name || 'Alguien'); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000); })
            .on('broadcast', { event: 'read' }, ({ payload: p }) => { if (p.user_id === user.id) return; setReadTimes(prev => ({ ...prev, [p.user_id]: p.read_at })); })
            .on('broadcast', { event: 'new_message' }, ({ payload: p }) => { addIncomingMessage(p); })
            .subscribe();
        const onlineChannel = supabase.channel('online_room_' + roomId);
        onlineChannel.on('presence', { event: 'sync' }, () => { const state = onlineChannel.presenceState(); const online: Record<string, string> = {}; Object.values(state).forEach((presences: any) => presences.forEach((p: any) => { online[p.user_id] = p.last_seen || new Date().toISOString(); })); setOnlineUsers(online); })
            .subscribe(async (status) => { if (status === 'SUBSCRIBED') await onlineChannel.track({ user_id: user.id, last_seen: new Date().toISOString() }); });
        const hb = setInterval(() => onlineChannel.track({ user_id: user.id, last_seen: new Date().toISOString() }), 30000);
        const poll = setInterval(async () => {
            const current = messagesRef.current;
            const lastReal = [...current].reverse().find(m => !m.id.startsWith('tmp_'));
            const since = lastReal?.created_at || new Date(0).toISOString();
            const { data } = await supabase.from('family_messages').select('*').eq('room_id', roomId).gt('created_at', since).order('created_at', { ascending: true });
            if (data && data.length > 0) { for (const msg of data) addIncomingMessage(msg); }
        }, 3000);
        return () => { clearInterval(hb); clearInterval(poll); supabase.removeChannel(channel); supabase.removeChannel(presenceChannel); supabase.removeChannel(onlineChannel); };
    }, [room]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUser]);
    const handleScroll = useCallback(() => { const el = scrollRef.current; if (el) setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200); }, []);
    const broadcastTyping = useCallback(() => { if (!roomId || !user) return; const myProf = profiles[user.id]; supabase.channel('typing_room_' + roomId).send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, name: myProf?.full_name || 'Alguien' } }); }, [roomId, user, profiles]);
    const markAsRead = useCallback(async () => { if (!room || !user) return; const now = new Date().toISOString(); await supabase.from('chat_read_status').upsert({ family_id: room.family_id, user_id: user.id, last_read_at: now }, { onConflict: 'family_id,user_id' }); supabase.channel('typing_room_' + roomId).send({ type: 'broadcast', event: 'read', payload: { user_id: user.id, read_at: now } }); }, [room, user, roomId]);

    const fetchRoom = async () => { const { data } = await supabase.from('chat_rooms').select('id, name, is_group, family_id').eq('id', roomId).single(); if (data) { setRoom(data); fetchRoomProfiles(data.id); } };
    const fetchRoomProfiles = async (rId: string) => { const { data: members } = await supabase.from('chat_room_members').select('user_id').eq('room_id', rId); if (!members || members.length === 0) return; const ids = members.map(m => m.user_id); const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', ids); if (profs) { const map: Record<string, Profile> = {}; profs.forEach((p: any) => { map[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url }; }); setProfiles(map); } };
    const fetchReadStatus = async () => { if (!room) return; const { data } = await supabase.from('chat_read_status').select('user_id, last_read_at').eq('family_id', room.family_id); if (data) { const map: Record<string, string> = {}; data.forEach((r: any) => { map[r.user_id] = r.last_read_at; }); setReadTimes(map); } };
    const fetchMessages = async () => {
        const { data } = await supabase.from('family_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200);
        if (!data || data.length === 0) { setMessages([]); return; }
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
        const profMap: Record<string, Profile> = {}; if (profs) profs.forEach((p: any) => { profMap[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url }; });
        const msgIds = data.map((m: any) => m.id);
        const { data: reactionData } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds);
        const reactionMap: Record<string, Reaction[]> = {}; if (reactionData) reactionData.forEach((r: any) => { if (!reactionMap[r.message_id]) reactionMap[r.message_id] = []; reactionMap[r.message_id].push({ emoji: r.emoji, user_id: r.user_id, user_name: profMap[r.user_id]?.full_name }); });
        const msgMap: Record<string, any> = {}; data.forEach((m: any) => { msgMap[m.id] = m; });
        setMessages(data.map((m: any) => { let reply_message = null; if (m.reply_to && msgMap[m.reply_to]) { const replied = msgMap[m.reply_to]; reply_message = { content: replied.content, user_id: replied.user_id, profile_name: profMap[replied.user_id]?.full_name }; } return { ...m, profile: profMap[m.user_id] || null, reactions: reactionMap[m.id] || [], reply_message }; }));
    };
    const fetchReactions = async () => { const msgIds = messages.map(m => m.id).filter(id => !id.startsWith('tmp_')); if (msgIds.length === 0) return; const { data } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds); if (!data) return; const rm: Record<string, Reaction[]> = {}; data.forEach((r: any) => { if (!rm[r.message_id]) rm[r.message_id] = []; rm[r.message_id].push({ emoji: r.emoji, user_id: r.user_id, user_name: profiles[r.user_id]?.full_name }); }); setMessages(prev => prev.map(m => ({ ...m, reactions: rm[m.id] || m.reactions || [] }))); };
    const toggleReaction = async (messageId: string, emoji: string) => { if (!user || messageId.startsWith('tmp_')) return; const existing = messages.find(m => m.id === messageId)?.reactions?.find(r => r.emoji === emoji && r.user_id === user.id); if (existing) await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji); else await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji }); };

    const handleSend = async () => {
        const text = input.trim(); if (!text || !user || !room || sending) return;
        setSending(true); setInput('');
        const replyId = replyingTo?.id?.startsWith('tmp_') ? null : replyingTo?.id || null;
        const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: text, created_at: new Date().toISOString(), profile: profiles[user.id] || null, reactions: [], reply_to: replyId, reply_message: replyingTo ? { content: replyingTo.content, user_id: replyingTo.user_id, profile_name: replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name } : null };
        setMessages(prev => [...prev, optimistic]); setReplyingTo(null);
        const payload: any = { family_id: room.family_id, room_id: room.id, user_id: user.id, content: text }; if (replyId) payload.reply_to = replyId;
        const { data: inserted, error } = await supabase.from('family_messages').insert(payload).select('*').single();
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        else if (inserted) broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted });
        setSending(false); inputRef.current?.focus();
    };

    const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' }); audioChunksRef.current = []; mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); }; mediaRecorder.start(); mediaRecorderRef.current = mediaRecorder; setRecording(true); setRecordTime(0); recordTimerRef.current = setInterval(() => { setRecordTime(prev => { if (prev >= MAX_RECORD_SECONDS - 1) { stopAndSendRecording(); return prev; } return prev + 1; }); }, 1000); } catch { /* mic unavailable */ } };
    const cancelRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop()); }; mediaRecorderRef.current.stop(); } if (recordTimerRef.current) clearInterval(recordTimerRef.current); audioChunksRef.current = []; setRecording(false); setRecordTime(0); };
    const stopAndSendRecording = async () => { if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return; if (recordTimerRef.current) clearInterval(recordTimerRef.current); const recorder = mediaRecorderRef.current; recorder.onstop = () => { recorder.stream?.getTracks().forEach(t => t.stop()); const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); if (blob.size < 1000) { setRecording(false); setRecordTime(0); return; } setRecording(false); setRecordTime(0); uploadAndSendAudio(blob); }; recorder.stop(); };
    const uploadAndSendAudio = async (blob: Blob) => { if (!user || !room) return; setSending(true); const fileName = `${room.id}/${user.id}_${Date.now()}.webm`; const { error: uploadError } = await supabase.storage.from('chat-audio').upload(fileName, blob, { contentType: 'audio/webm' }); if (uploadError) { setSending(false); return; } const { data: urlData } = supabase.storage.from('chat-audio').getPublicUrl(fileName); if (!urlData?.publicUrl) { setSending(false); return; } const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] }; setMessages(prev => [...prev, optimistic]); const { data: inserted, error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl }).select('*').single(); if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id)); else if (inserted) broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted }); setSending(false); };
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !user || !room) return; e.target.value = ''; if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return; setUploadingImage(true); const ext = file.name.split('.').pop() || 'jpg'; const fileName = `${room.id}/${user.id}_${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type }); if (uploadError) { setUploadingImage(false); return; } const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName); if (!urlData?.publicUrl) { setUploadingImage(false); return; } const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] }; setMessages(prev => [...prev, optimistic]); const { data: inserted, error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl }).select('*').single(); if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id)); else if (inserted) broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted }); setUploadingImage(false); };

    const handleLongPressStart = (msgId: string) => { setLongPressTimer(setTimeout(() => setPickerMsgId(msgId), 400)); };
    const handleLongPressEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };
    const isMessageRead = (msg: Message) => { if (msg.user_id !== user?.id) return false; return Object.entries(readTimes).some(([uid, readAt]) => uid !== user?.id && new Date(readAt) >= new Date(msg.created_at)); };
    const getOnlineStatus = () => { const others = Object.keys(onlineUsers).filter(uid => uid !== user?.id); if (others.length === 0) return `${Object.keys(profiles).length} participantes`; if (!room?.is_group && others.length > 0) return 'en línea'; const names = others.map(uid => profiles[uid]?.full_name || 'Usuario').slice(0, 2); return names.join(', ') + ' en línea'; };
    const getRoomTitle = () => { if (room?.is_group) return room.name || 'Grupo'; const otherIds = Object.keys(profiles).filter(id => id !== user?.id); if (otherIds.length > 0) return profiles[otherIds[0]]?.full_name || 'Chat'; return room?.name || 'Chat'; };
    const getRoomAvatar = () => { if (room?.is_group) return null; const otherIds = Object.keys(profiles).filter(id => id !== user?.id); return otherIds.length > 0 ? profiles[otherIds[0]] : null; };

    if (!user || !room) {
        if (!user) return null;
        return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-white/80 border-t-transparent rounded-full" /></div>);
    }

    const otherAvatar = getRoomAvatar();
    const isAudio = (msg: Message) => !!msg.media_url && msg.media_url.endsWith('.webm');
    const isImage = (msg: Message) => !!msg.media_url && !msg.media_url.endsWith('.webm');
    const hasOnlineOthers = Object.keys(onlineUsers).filter(u => u !== user?.id).length > 0;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto relative" onClick={() => pickerMsgId && setPickerMsgId(null)}>
            {/* ===== HEADER ===== */}
            <div className="flex items-center gap-2.5 px-2 py-2 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white sticky top-0 z-10 shadow-md">
                <Link href="/apps/mi-hogar/chat" className="p-1">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="relative">
                    {otherAvatar ? (
                        <Avatar className="h-10 w-10 ring-2 ring-white/20">
                            <AvatarImage src={otherAvatar.avatar_url} />
                            <AvatarFallback className="bg-[#133f21] text-white text-sm font-semibold">{otherAvatar.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-[#133f21] ring-2 ring-white/20 flex items-center justify-center text-white text-lg font-semibold">
                            {getRoomTitle().slice(0, 1).toUpperCase()}
                        </div>
                    )}
                    {hasOnlineOthers && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7ecf6d] ring-2 ring-[#1a5c2e]" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold leading-tight truncate tracking-tight">{getRoomTitle()}</p>
                    <p className="text-[11.5px] leading-tight">
                        {typingUser ? (
                            <span className="italic text-[#7ecf6d]">escribiendo...</span>
                        ) : (
                            <span className="text-white/60">{getOnlineStatus()}</span>
                        )}
                    </p>
                </div>
                <button className="p-2 rounded-full hover:bg-white/10"><Phone className="h-[18px] w-[18px]" /></button>
                <button className="p-2 rounded-full hover:bg-white/10"><MoreVertical className="h-[18px] w-[18px]" /></button>
            </div>

            {/* ===== CHAT AREA ===== */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-3 space-y-[3px] bg-[#f4f1ec] dark:bg-[#0f1612]">
                {messages.length === 0 && (
                    <div className="flex justify-center pt-8">
                        <div className="bg-[#1a5c2e]/5 dark:bg-[#1a5c2e]/10 border border-[#1a5c2e]/10 rounded-2xl px-5 py-3.5 max-w-[85%]">
                            <p className="text-[13px] text-[#5a6b5e] dark:text-[#8a9b8e] text-center leading-relaxed">
                                Los mensajes de tu familia aparecerán aquí. ¡Empieza la conversación!
                            </p>
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMine = msg.user_id === user?.id;
                    const profile = msg.profile || profiles[msg.user_id];
                    const showSep = shouldShowDateSep(msg.created_at, messages[i - 1]?.created_at);
                    const showName = !isMine && room?.is_group && (i === 0 || messages[i - 1]?.user_id !== msg.user_id || showSep);
                    const prevSameUser = i > 0 && messages[i - 1]?.user_id === msg.user_id && !showSep;
                    const isFirstInGroup = !prevSameUser;
                    const read = isMessageRead(msg);
                    const hasAudioMsg = isAudio(msg);
                    const hasImageMsg = isImage(msg);
                    const contactCol = getContactColor(msg.user_id);

                    return (
                        <React.Fragment key={msg.id}>
                            {showSep && (
                                <div className="flex justify-center py-3">
                                    <span className="text-[11px] bg-[#1a5c2e]/8 dark:bg-[#1a5c2e]/20 text-[#1a5c2e] dark:text-[#7ecf6d] px-4 py-1 rounded-full font-medium tracking-wide">{dateSepLabel(msg.created_at)}</span>
                                </div>
                            )}
                            <div
                                id={'msg-' + msg.id}
                                className={`flex transition-all duration-500 ${isMine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : ''}`}
                                onTouchStart={() => handleLongPressStart(msg.id)}
                                onTouchEnd={handleLongPressEnd}
                                onMouseDown={() => handleLongPressStart(msg.id)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onContextMenu={(e) => { e.preventDefault(); setPickerMsgId(msg.id); }}
                            >
                                <div className={`relative max-w-[80%] ${hasImageMsg ? 'max-w-[65%]' : ''}`}>
                                    {/* Emoji picker */}
                                    <AnimatePresence>
                                        {pickerMsgId === msg.id && (
                                            <motion.div initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e2a20] rounded-full shadow-xl border border-[#1a5c2e]/10 px-1 py-0.5 flex gap-0 items-center z-30">
                                                <button onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); setPickerMsgId(null); }} className="p-1.5 hover:bg-[#1a5c2e]/5 rounded-full"><Reply className="h-4 w-4 text-[#5a6b5e]" /></button>
                                                <div className="w-px h-4 bg-[#1a5c2e]/10 mx-0.5" />
                                                {QUICK_EMOJIS.map(emoji => <button key={emoji} onClick={() => { toggleReaction(msg.id, emoji); setPickerMsgId(null); }} className="text-[17px] p-1 hover:scale-110 active:scale-90 transition-transform">{emoji}</button>)}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Bubble */}
                                    <div className={`relative text-[14.5px] leading-[20px] shadow-sm ${
                                        hasImageMsg
                                            ? isMine ? 'bg-[#e4f0d8] dark:bg-[#1a3322] rounded-2xl overflow-hidden' : 'bg-[#f7f4ef] dark:bg-[#1e2a20] rounded-2xl overflow-hidden'
                                            : isMine
                                                ? 'bg-[#e4f0d8] dark:bg-[#1a3322] rounded-2xl px-3 py-1.5'
                                                : 'bg-[#f7f4ef] dark:bg-[#1e2a20] rounded-2xl px-3 py-1.5'
                                    } ${isFirstInGroup && isMine ? 'rounded-tr-sm' : ''} ${isFirstInGroup && !isMine ? 'rounded-tl-sm' : ''}`}>

                                        {/* Contact name (groups) */}
                                        {showName && profile && (
                                            <p className="text-[12px] font-semibold mb-0.5" style={{ color: contactCol }}>
                                                {profile.full_name}
                                            </p>
                                        )}

                                        {/* Reply quote */}
                                        {msg.reply_message && (
                                            <div
                                                className={`rounded-xl mb-1.5 overflow-hidden cursor-pointer border-l-[3px] ${isMine ? 'bg-[#d4e8c6] dark:bg-[#143020]' : 'bg-[#eeeae4] dark:bg-[#162018]'}`}
                                                style={{ borderLeftColor: msg.reply_message.user_id === user?.id ? '#1a5c2e' : contactCol }}
                                                onClick={(e) => { e.stopPropagation(); if (msg.reply_to) { const el = document.getElementById('msg-' + msg.reply_to); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-[#1a5c2e]/10'); setTimeout(() => el.classList.remove('bg-[#1a5c2e]/10'), 2000); } } }}
                                            >
                                                <div className="px-2.5 py-1.5">
                                                    <p className="text-[11.5px] font-semibold" style={{ color: msg.reply_message.user_id === user?.id ? '#1a5c2e' : contactCol }}>
                                                        {msg.reply_message.user_id === user?.id ? 'Tú' : (msg.reply_message.profile_name || 'Usuario')}
                                                    </p>
                                                    <p className="text-[11.5px] text-[#6b7b6e] dark:text-[#8a9b8e] truncate">{msg.reply_message.content || 'Nota de voz'}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Content */}
                                        {hasImageMsg ? (
                                            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.media_url!); }}>
                                                <img src={msg.media_url!} alt="" className="w-full max-w-[300px] max-h-[320px] object-cover" loading="lazy" />
                                                <div className="flex items-center justify-end gap-1 px-3 py-1.5">
                                                    <span className="text-[11px] text-[#6b7b6e] dark:text-[#8a9b8e]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#c8a23c]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#6b7b6e]/50" />)}
                                                </div>
                                            </div>
                                        ) : hasAudioMsg ? (
                                            <>
                                                <AudioPlayer url={msg.media_url!} isMine={isMine} />
                                                <div className="flex items-center justify-end gap-1 -mt-0.5">
                                                    <span className="text-[11px] text-[#6b7b6e] dark:text-[#8a9b8e]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#c8a23c]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#6b7b6e]/50" />)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-wrap items-end">
                                                <span className="whitespace-pre-wrap break-words text-[#1a2318] dark:text-[#e0e8e2]">{msg.content}</span>
                                                <span className="flex items-center gap-0.5 ml-auto pl-2.5 pb-[1px] flex-shrink-0 translate-y-[2px]">
                                                    <span className="text-[11px] text-[#6b7b6e] dark:text-[#8a9b8e]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#c8a23c]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#6b7b6e]/50" />)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            {Object.entries(msg.reactions.reduce((acc, r) => { if (!acc[r.emoji]) acc[r.emoji] = []; acc[r.emoji].push(r); return acc; }, {} as Record<string, Reaction[]>)).map(([emoji, users]) => (
                                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className={`text-[12px] px-1.5 py-0 rounded-full shadow-sm border ${users.some(u => u.user_id === user.id) ? 'bg-[#e4f0d8] dark:bg-[#1a3322] border-[#1a5c2e]/20' : 'bg-white dark:bg-[#1e2a20] border-[#1a5c2e]/10'}`}>
                                                    {emoji}{users.length > 1 && <span className="text-[10px] ml-0.5">{users.length}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                    {typingUser && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex justify-start mt-1">
                            <div className="bg-[#f7f4ef] dark:bg-[#1e2a20] rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                                <div className="flex gap-[5px] items-center">
                                    {[0, 1, 2].map(i => (
                                        <motion.span key={i} className="w-[7px] h-[7px] rounded-full bg-[#1a5c2e]/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Scroll down button */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-20 right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-[#1e2a20] shadow-lg border border-[#1a5c2e]/10 flex items-center justify-center">
                        <ChevronDown className="h-5 w-5 text-[#1a5c2e]" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ===== INPUT AREA ===== */}
            <div className="bg-[#eae6df] dark:bg-[#141e16] px-2 py-1.5">
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-1">
                            <div className="bg-white dark:bg-[#1e2a20] rounded-xl overflow-hidden mx-0.5 border border-[#1a5c2e]/10">
                                <div className="flex items-stretch">
                                    <div className="w-1 bg-[#1a5c2e] flex-shrink-0" />
                                    <div className="flex-1 px-3 py-2 min-w-0">
                                        <p className="text-[12px] font-semibold text-[#1a5c2e]">{replyingTo.user_id === user?.id ? 'Tú' : (replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name || 'Usuario')}</p>
                                        <p className="text-[13px] text-[#6b7b6e] truncate">{replyingTo.content || 'Nota de voz'}</p>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="px-3 flex items-center"><X className="h-4 w-4 text-[#6b7b6e]" /></button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-end gap-1.5">
                    <AnimatePresence mode="wait">
                        {recording ? (
                            <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 h-[46px] bg-white dark:bg-[#1e2a20] rounded-2xl px-4">
                                <button onClick={cancelRecording} className="text-red-500"><X className="h-5 w-5" /></button>
                                <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[14px] text-red-500 font-medium tabular-nums flex-1">{formatDuration(recordTime)}</span>
                                <div className="flex items-end gap-[1.5px]">
                                    {Array.from({ length: 28 }).map((_, i) => (
                                        <motion.div key={i} animate={{ height: [2, Math.random() * 14 + 3, 2] }} transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 }} className="w-[2px] bg-[#1a5c2e]/30 rounded-full" style={{ height: 2 }} />
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="inp" initial={false} className="flex items-end flex-1 bg-white dark:bg-[#1e2a20] rounded-2xl pl-3 pr-1.5">
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage} className="py-2.5 text-[#6b7b6e] hover:text-[#1a5c2e] transition-colors disabled:opacity-40 flex-shrink-0">
                                    <Paperclip className="h-[22px] w-[22px]" />
                                </button>
                                <input ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); broadcastTyping(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Escribe un mensaje..." className="flex-1 h-[46px] bg-transparent text-[15px] text-[#1a2318] dark:text-[#e0e8e2] placeholder:text-[#6b7b6e]/60 dark:placeholder:text-[#8a9b8e]/60 outline-none px-2" autoComplete="off" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button type="button" onClick={recording ? stopAndSendRecording : (input.trim() ? handleSend : startRecording)} disabled={sending}
                        className="h-[46px] w-[46px] rounded-2xl bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] hover:from-[#1e7a3a] hover:to-[#22884a] flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 shadow-sm"
                    >
                        {input.trim() || recording ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Image preview fullscreen */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0f1612] flex items-center justify-center" onClick={() => setPreviewImage(null)}>
                        <button className="absolute top-4 left-4 h-10 w-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 z-10"><X className="h-6 w-6" /></button>
                        <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} src={previewImage} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
