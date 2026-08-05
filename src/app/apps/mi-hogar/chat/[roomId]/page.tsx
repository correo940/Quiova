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
const CONTACT_COLORS = ['#25D366', '#34B7F1', '#FF6B6B', '#E8912D', '#B066D4', '#20C997', '#E84393', '#0984E3'];

function formatMsgTime(dateStr: string) {
    return format(new Date(dateStr), 'HH:mm');
}
function shouldShowDateSep(current: string, prev?: string) {
    if (!prev) return true;
    return new Date(current).toDateString() !== new Date(prev).toDateString();
}
function dateSepLabel(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'HOY';
    if (isYesterday(d)) return 'AYER';
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase();
}
function formatDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
function getContactColor(userId: string) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return CONTACT_COLORS[Math.abs(hash) % CONTACT_COLORS.length];
}

// WhatsApp doodle-style background pattern
const chatWallpaper = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 5c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2zM8 15a2 2 0 100 4 2 2 0 000-4zM32 15a2 2 0 100 4 2 2 0 000-4zM15 30a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM28 32a1 1 0 100 2 1 1 0 000-2z' fill='%23111' fill-opacity='.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`;

function AudioPlayer({ url, isMine }: { url: string; isMine: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onLoaded = () => setDuration(audio.duration || 0);
        const onTime = () => setCurrentTime(audio.currentTime);
        const onEnded = () => { setPlaying(false); setCurrentTime(0); };
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnded);
        return () => { audio.removeEventListener('loadedmetadata', onLoaded); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded); };
    }, []);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) audio.pause(); else audio.play();
        setPlaying(!playing);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const col = isMine ? 'text-[#0d3320]' : 'text-[#075e54]';

    return (
        <div className="flex items-center gap-2 min-w-[200px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            <button onClick={toggle} className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-[#0d3320]/20' : 'bg-[#075e54]/10'}`}>
                {playing ? <Pause className={`h-5 w-5 ${col}`} /> : <Play className={`h-5 w-5 ml-0.5 ${col}`} />}
            </button>
            <div className="flex-1 min-w-0">
                <div className="relative h-[5px] rounded-full overflow-hidden bg-black/10">
                    <div className="h-full rounded-full bg-[#075e54] transition-all duration-100" style={{ width: `${progress}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#075e54] shadow-sm transition-all duration-100" style={{ left: `calc(${progress}% - 6px)` }} />
                </div>
                <p className="text-[11px] mt-1 text-black/40 tabular-nums">
                    {playing || currentTime > 0 ? formatDuration(currentTime) : (duration > 0 ? formatDuration(duration) : '0:00')}
                </p>
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
                let reply_message = null;
                if (msg.reply_to) {
                    const replied = messages.find(m => m.id === msg.reply_to);
                    if (replied) reply_message = { content: replied.content, user_id: replied.user_id, profile_name: replied.profile?.full_name || profiles[replied.user_id]?.full_name };
                }
                setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, profile, reactions: [], reply_message }]);
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
        const msgMap: Record<string, any> = {};
        data.forEach((m: any) => { msgMap[m.id] = m; });
        setMessages(data.map((m: any) => {
            let reply_message = null;
            if (m.reply_to && msgMap[m.reply_to]) {
                const replied = msgMap[m.reply_to];
                reply_message = { content: replied.content, user_id: replied.user_id, profile_name: profMap[replied.user_id]?.full_name };
            }
            return { ...m, profile: profMap[m.user_id] || null, reactions: reactionMap[m.id] || [], reply_message };
        }));
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
        const replyId = replyingTo?.id?.startsWith('tmp_') ? null : replyingTo?.id || null;
        const optimistic: Message = {
            id: 'tmp_' + Date.now(), user_id: user.id, content: text, created_at: new Date().toISOString(),
            profile: profiles[user.id] || null, reactions: [], reply_to: replyId,
            reply_message: replyingTo ? { content: replyingTo.content, user_id: replyingTo.user_id, profile_name: replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name } : null,
        };
        setMessages(prev => [...prev, optimistic]);
        setReplyingTo(null);
        const payload: any = { family_id: room.family_id, room_id: room.id, user_id: user.id, content: text };
        if (replyId) payload.reply_to = replyId;
        const { error } = await supabase.from('family_messages').insert(payload);
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setSending(false); inputRef.current?.focus();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setRecording(true); setRecordTime(0);
            recordTimerRef.current = setInterval(() => {
                setRecordTime(prev => { if (prev >= MAX_RECORD_SECONDS - 1) { stopAndSendRecording(); return prev; } return prev + 1; });
            }, 1000);
        } catch { /* mic unavailable */ }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop()); };
            mediaRecorderRef.current.stop();
        }
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        audioChunksRef.current = []; setRecording(false); setRecordTime(0);
    };

    const stopAndSendRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const recorder = mediaRecorderRef.current;
        recorder.onstop = () => {
            recorder.stream?.getTracks().forEach(t => t.stop());
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (blob.size < 1000) { setRecording(false); setRecordTime(0); return; }
            setRecording(false); setRecordTime(0);
            uploadAndSendAudio(blob);
        };
        recorder.stop();
    };

    const uploadAndSendAudio = async (blob: Blob) => {
        if (!user || !room) return;
        setSending(true);
        const fileName = `${room.id}/${user.id}_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from('chat-audio').upload(fileName, blob, { contentType: 'audio/webm' });
        if (uploadError) { setSending(false); return; }
        const { data: urlData } = supabase.storage.from('chat-audio').getPublicUrl(fileName);
        if (!urlData?.publicUrl) { setSending(false); return; }
        const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] };
        setMessages(prev => [...prev, optimistic]);
        const { error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl });
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setSending(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !room) return;
        e.target.value = '';
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
        setUploadingImage(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${room.id}/${user.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type });
        if (uploadError) { setUploadingImage(false); return; }
        const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        if (!urlData?.publicUrl) { setUploadingImage(false); return; }
        const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] };
        setMessages(prev => [...prev, optimistic]);
        const { error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl });
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setUploadingImage(false);
    };

    const handleLongPressStart = (msgId: string) => { setLongPressTimer(setTimeout(() => setPickerMsgId(msgId), 400)); };
    const handleLongPressEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };

    const isMessageRead = (msg: Message) => {
        if (msg.user_id !== user?.id) return false;
        return Object.entries(readTimes).some(([uid, readAt]) => uid !== user?.id && new Date(readAt) >= new Date(msg.created_at));
    };

    const getOnlineStatus = () => {
        const others = Object.keys(onlineUsers).filter(uid => uid !== user?.id);
        if (others.length === 0) return `${Object.keys(profiles).length} participantes`;
        if (!room?.is_group && others.length > 0) return 'en línea';
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
            <div className="min-h-screen flex items-center justify-center bg-[#075e54]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    const otherAvatar = getRoomAvatar();
    const isAudio = (msg: Message) => !!msg.media_url && msg.media_url.endsWith('.webm');
    const isImage = (msg: Message) => !!msg.media_url && !msg.media_url.endsWith('.webm');
    const hasOnlineOthers = Object.keys(onlineUsers).filter(u => u !== user?.id).length > 0;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto relative" onClick={() => pickerMsgId && setPickerMsgId(null)}>
            {/* ===== WHATSAPP HEADER ===== */}
            <div className="flex items-center gap-2 px-1 py-1.5 bg-[#075e54] text-white sticky top-0 z-10">
                <Link href="/apps/mi-hogar/chat" className="p-1.5">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="relative mr-1">
                    {otherAvatar ? (
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={otherAvatar.avatar_url} />
                            <AvatarFallback className="bg-[#128c7e] text-white text-sm font-medium">{otherAvatar.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white text-lg font-medium">
                            {getRoomTitle().slice(0, 1).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium leading-tight truncate">{getRoomTitle()}</p>
                    <p className="text-[12px] text-white/80 leading-tight">
                        {typingUser ? (
                            <span className="italic text-[#25D366]">escribiendo...</span>
                        ) : hasOnlineOthers ? (
                            <span>{getOnlineStatus()}</span>
                        ) : (
                            <span className="text-white/60">{getOnlineStatus()}</span>
                        )}
                    </p>
                </div>
                <button className="p-2 rounded-full hover:bg-white/10"><Phone className="h-5 w-5" /></button>
                <button className="p-2 rounded-full hover:bg-white/10"><MoreVertical className="h-5 w-5" /></button>
            </div>

            {/* ===== CHAT AREA ===== */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-2.5 py-3 space-y-[2px] bg-[#efeae2] dark:bg-[#0b141a]" style={{ backgroundImage: chatWallpaper }}>
                {messages.length === 0 && (
                    <div className="flex justify-center pt-8">
                        <div className="bg-[#fcf4cb] dark:bg-[#1d2b1f] rounded-lg px-4 py-3 max-w-[85%] shadow-sm">
                            <p className="text-[12.5px] text-[#54656f] dark:text-[#8696a0] text-center leading-relaxed">
                                Los mensajes están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.
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
                    const nextSameUser = i < messages.length - 1 && messages[i + 1]?.user_id === msg.user_id && !shouldShowDateSep(messages[i + 1]?.created_at, msg.created_at);
                    const isFirstInGroup = !prevSameUser;
                    const read = isMessageRead(msg);
                    const hasAudioMsg = isAudio(msg);
                    const hasImageMsg = isImage(msg);
                    const contactCol = getContactColor(msg.user_id);

                    return (
                        <React.Fragment key={msg.id}>
                            {showSep && (
                                <div className="flex justify-center py-2.5">
                                    <span className="text-[11.5px] bg-white/90 dark:bg-[#1f2c34] px-3 py-1 rounded-lg text-[#54656f] dark:text-[#8696a0] font-medium shadow-sm uppercase tracking-wide text-[10.5px]">{dateSepLabel(msg.created_at)}</span>
                                </div>
                            )}
                            <div
                                id={'msg-' + msg.id}
                                className={`flex transition-all duration-500 ${isMine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-1.5' : ''}`}
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
                                            <motion.div initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white dark:bg-[#233138] rounded-full shadow-xl px-1 py-0.5 flex gap-0 items-center z-30">
                                                <button onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); setPickerMsgId(null); }} className="p-1.5 hover:bg-black/5 rounded-full"><Reply className="h-4 w-4 text-[#54656f]" /></button>
                                                <div className="w-px h-4 bg-black/10 mx-0.5" />
                                                {QUICK_EMOJIS.map(emoji => <button key={emoji} onClick={() => { toggleReaction(msg.id, emoji); setPickerMsgId(null); }} className="text-[17px] p-1 hover:scale-110 active:scale-90 transition-transform">{emoji}</button>)}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* WhatsApp bubble with tail */}
                                    <div className={`relative rounded-lg text-[14.2px] leading-[19px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
                                        hasImageMsg
                                            ? isMine ? 'bg-[#d9fdd3] dark:bg-[#005c4b]' : 'bg-white dark:bg-[#202c33]'
                                            : isMine
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] px-2 py-1'
                                                : 'bg-white dark:bg-[#202c33] px-2 py-1'
                                    } ${isFirstInGroup && isMine ? 'rounded-tr-none' : ''} ${isFirstInGroup && !isMine ? 'rounded-tl-none' : ''}`}>
                                        {/* Tail SVG */}
                                        {isFirstInGroup && isMine && (
                                            <svg className="absolute -right-2 top-0 w-2 h-[13px]" viewBox="0 0 8 13"><path d="M5 0H0v8.9C.3 3.4 4 1.4 8 0H5z" className="fill-[#d9fdd3] dark:fill-[#005c4b]" /></svg>
                                        )}
                                        {isFirstInGroup && !isMine && (
                                            <svg className="absolute -left-2 top-0 w-2 h-[13px]" viewBox="0 0 8 13"><path d="M3 0h5v8.9C7.7 3.4 4 1.4 0 0h3z" className="fill-white dark:fill-[#202c33]" /></svg>
                                        )}

                                        {/* Contact name (groups) */}
                                        {showName && profile && (
                                            <p className="text-[12.5px] font-medium mb-0.5 px-1" style={{ color: contactCol }}>
                                                {profile.full_name}
                                            </p>
                                        )}

                                        {/* Reply quote */}
                                        {msg.reply_message && (
                                            <div
                                                className={`rounded-md mb-1 overflow-hidden cursor-pointer border-l-[4px] ${isMine ? 'bg-[#c5e8be] dark:bg-[#025144]' : 'bg-[#f0f0f0] dark:bg-[#1a2329]'}`}
                                                style={{ borderLeftColor: msg.reply_message.user_id === user?.id ? '#25D366' : contactCol }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (msg.reply_to) {
                                                        const el = document.getElementById('msg-' + msg.reply_to);
                                                        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-[#b3d8f1]/40'); setTimeout(() => el.classList.remove('bg-[#b3d8f1]/40'), 2000); }
                                                    }
                                                }}
                                            >
                                                <div className="px-2 py-1.5">
                                                    <p className="text-[12px] font-medium" style={{ color: msg.reply_message.user_id === user?.id ? '#25D366' : contactCol }}>
                                                        {msg.reply_message.user_id === user?.id ? 'Tú' : (msg.reply_message.profile_name || 'Usuario')}
                                                    </p>
                                                    <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate">
                                                        {msg.reply_message.content || 'Nota de voz'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Content */}
                                        {hasImageMsg ? (
                                            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.media_url!); }}>
                                                <img src={msg.media_url!} alt="" className="rounded-md w-full max-w-[300px] max-h-[320px] object-cover" loading="lazy" />
                                                <div className="flex items-center justify-end gap-1 px-2 py-1">
                                                    <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#53bdeb]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#667781]/60" />)}
                                                </div>
                                            </div>
                                        ) : hasAudioMsg ? (
                                            <>
                                                <AudioPlayer url={msg.media_url!} isMine={isMine} />
                                                <div className="flex items-center justify-end gap-1 -mt-0.5">
                                                    <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#53bdeb]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#667781]/60" />)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-wrap items-end">
                                                <span className="whitespace-pre-wrap break-words text-[#111b21] dark:text-[#e9edef]">{msg.content}</span>
                                                <span className="flex items-center gap-0.5 ml-auto pl-2 pb-[1px] flex-shrink-0 translate-y-[2px]">
                                                    <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">{formatMsgTime(msg.created_at)}</span>
                                                    {isMine && (read ? <CheckCheck className="h-[15px] w-[15px] text-[#53bdeb]" /> : <CheckCheck className="h-[15px] w-[15px] text-[#667781]/60" />)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            {Object.entries(msg.reactions.reduce((acc, r) => { if (!acc[r.emoji]) acc[r.emoji] = []; acc[r.emoji].push(r); return acc; }, {} as Record<string, Reaction[]>)).map(([emoji, users]) => (
                                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className={`text-[12px] px-1.5 py-0 rounded-full shadow-sm ${users.some(u => u.user_id === user.id) ? 'bg-[#d1f4cc] dark:bg-[#005c4b] ring-1 ring-[#25D366]/40' : 'bg-white dark:bg-[#202c33]'}`}>
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
                            <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative">
                                <svg className="absolute -left-2 top-0 w-2 h-[13px]" viewBox="0 0 8 13"><path d="M3 0h5v8.9C7.7 3.4 4 1.4 0 0h3z" className="fill-white dark:fill-[#202c33]" /></svg>
                                <div className="flex gap-[4px] items-center">
                                    {[0, 1, 2].map(i => (
                                        <motion.span key={i} className="w-[7px] h-[7px] rounded-full bg-[#8696a0]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
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
                    <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-20 right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-[#202c33] shadow-lg flex items-center justify-center">
                        <ChevronDown className="h-5 w-5 text-[#54656f]" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ===== INPUT AREA (WhatsApp style) ===== */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-2 py-1.5">
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-1">
                            <div className="bg-white dark:bg-[#1a2329] rounded-lg overflow-hidden mx-0.5">
                                <div className="flex items-stretch">
                                    <div className="w-1 bg-[#25D366] flex-shrink-0" />
                                    <div className="flex-1 px-3 py-2 min-w-0">
                                        <p className="text-[12px] font-medium text-[#25D366]">
                                            {replyingTo.user_id === user?.id ? 'Tú' : (replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name || 'Usuario')}
                                        </p>
                                        <p className="text-[13px] text-[#667781] truncate">{replyingTo.content || 'Nota de voz'}</p>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="px-3 flex items-center">
                                        <X className="h-4 w-4 text-[#8696a0]" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-end gap-1.5">
                    <AnimatePresence mode="wait">
                        {recording ? (
                            <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 h-[46px] bg-white dark:bg-[#2a3942] rounded-full px-4">
                                <button onClick={cancelRecording} className="text-red-500"><X className="h-5 w-5" /></button>
                                <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[14px] text-red-500 font-medium tabular-nums flex-1">{formatDuration(recordTime)}</span>
                                <div className="flex items-end gap-[1.5px]">
                                    {Array.from({ length: 28 }).map((_, i) => (
                                        <motion.div key={i} animate={{ height: [2, Math.random() * 14 + 3, 2] }} transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 }} className="w-[2px] bg-[#8696a0]/50 rounded-full" style={{ height: 2 }} />
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="inp" initial={false} className="flex items-end flex-1 bg-white dark:bg-[#2a3942] rounded-[24px] pl-3 pr-1.5">
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage} className="py-2.5 text-[#54656f] dark:text-[#8696a0] hover:text-[#075e54] transition-colors disabled:opacity-40 flex-shrink-0">
                                    <Paperclip className="h-[22px] w-[22px]" />
                                </button>
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Mensaje"
                                    className="flex-1 h-[46px] bg-transparent text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] dark:placeholder:text-[#8696a0] outline-none px-2"
                                    autoComplete="off"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Green mic/send button (WhatsApp) */}
                    <button
                        type="button"
                        onClick={recording ? stopAndSendRecording : (input.trim() ? handleSend : startRecording)}
                        disabled={sending}
                        className="h-[46px] w-[46px] rounded-full bg-[#00a884] hover:bg-[#008f72] flex items-center justify-center text-white transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
                    >
                        {input.trim() || recording ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Image preview fullscreen */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#111b21] flex items-center justify-center" onClick={() => setPreviewImage(null)}>
                        <button className="absolute top-4 left-4 h-10 w-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 z-10">
                            <X className="h-6 w-6" />
                        </button>
                        <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} src={previewImage} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
