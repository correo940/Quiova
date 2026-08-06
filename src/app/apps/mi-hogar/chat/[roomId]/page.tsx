'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronDown, Send, Check, CheckCheck, Reply, X, Mic, Play, Pause, Paperclip, MoreVertical, Phone, Camera, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type Reaction = { emoji: string; user_id: string; user_name?: string };
type Message = {
    id: string; user_id: string; content: string; created_at: string;
    reply_to?: string | null; media_url?: string | null; tone?: string;
    reply_message?: { content: string; user_id: string; profile_name?: string } | null;
    profile?: { full_name: string; avatar_url: string; bubble_color?: string; mood?: string } | null;
    reactions?: Reaction[];
};
type Profile = { full_name: string; avatar_url: string; bubble_color?: string; mood?: string };
type RoomInfo = { id: string; name: string; is_group: boolean; family_id: string; avatar_url?: string | null };

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MAX_RECORD_SECONDS = 120;
const CONTACT_COLORS = ['#2d7a4a', '#8b6914', '#a0522d', '#6b4c8a', '#2e7d8c', '#8c5e3c', '#5c7a3e', '#7a3e5c'];

const MOODS = [
    { emoji: '😊', label: 'Feliz' }, { emoji: '😢', label: 'Triste' }, { emoji: '😡', label: 'Enfadado' },
    { emoji: '😴', label: 'Cansado' }, { emoji: '🤩', label: 'Emocionado' }, { emoji: '😌', label: 'Relajado' },
    { emoji: '🤔', label: 'Pensativo' }, { emoji: '😰', label: 'Ansioso' }, { emoji: '🥰', label: 'Enamorado' },
    { emoji: '😎', label: 'Genial' }, { emoji: '🤒', label: 'Enfermo' }, { emoji: '😤', label: 'Frustrado' },
    { emoji: '🥳', label: 'De fiesta' }, { emoji: '😇', label: 'Agradecido' }, { emoji: '🫠', label: 'Derretido' },
    { emoji: '😶', label: 'Sin palabras' }, { emoji: '🤗', label: 'Cariñoso' }, { emoji: '😏', label: 'Travieso' },
    { emoji: '🥱', label: 'Aburrido' }, { emoji: '💪', label: 'Motivado' }, { emoji: '🧘', label: 'En paz' },
    { emoji: '😬', label: 'Nervioso' }, { emoji: '🤯', label: 'Flipando' }, { emoji: '😋', label: 'Con hambre' },
    { emoji: '☕', label: 'Necesito café' }, { emoji: '🎵', label: 'Musical' }, { emoji: '📚', label: 'Estudiando' },
    { emoji: '💼', label: 'Trabajando' }, { emoji: '🏃', label: 'Activo' }, { emoji: '🛋️', label: 'Modo sofá' },
    { emoji: '🌧️', label: 'Melancólico' }, { emoji: '✨', label: 'Inspirado' }, { emoji: '😵‍💫', label: 'Mareado' },
    { emoji: '🔥', label: 'On fire' }, { emoji: '🫣', label: 'Vergüenza' }, { emoji: '💀', label: 'Muerto de risa' },
];

const TONES = [
    { id: 'normal', emoji: '🗣️', label: 'Normal' },
    { id: 'gritando', emoji: '📢', label: 'Gritando' },
    { id: 'susurrando', emoji: '🤫', label: 'Susurrando' },
    { id: 'cantando', emoji: '🎵', label: 'Cantando' },
    { id: 'riendo', emoji: '😂', label: 'Riendo' },
    { id: 'llorando', emoji: '😭', label: 'Llorando' },
    { id: 'ironia', emoji: '😏', label: 'Con ironía' },
    { id: 'amor', emoji: '💕', label: 'Con amor' },
    { id: 'rabia', emoji: '😤', label: 'Con rabia' },
    { id: 'miedo', emoji: '😱', label: 'Asustado' },
    { id: 'suplicando', emoji: '🥺', label: 'Suplicando' },
    { id: 'dramatizando', emoji: '🎭', label: 'Dramatizando' },
    { id: 'sarcasmo', emoji: '🙃', label: 'Sarcástico' },
    { id: 'autoridad', emoji: '👑', label: 'Con autoridad' },
    { id: 'calma', emoji: '🧘', label: 'Con calma' },
    { id: 'secreto', emoji: '🤐', label: 'En secreto' },
    { id: 'emocion', emoji: '🤩', label: 'Emocionado' },
    { id: 'cansancio', emoji: '😩', label: 'Agotado' },
    { id: 'confusion', emoji: '🤷', label: 'Confuso' },
    { id: 'orgullo', emoji: '😤', label: 'Con orgullo' },
];
const BUBBLE_COLOR_OPTIONS = [
    { id: 'green', label: 'Verde', mine: '#e4f0d8', mineDark: '#1a3322', border: '#1a5c2e' },
    { id: 'blue', label: 'Azul', mine: '#d8e8f0', mineDark: '#1a2d3e', border: '#2e6b8c' },
    { id: 'purple', label: 'Morado', mine: '#e8d8f0', mineDark: '#2a1a3e', border: '#6b4c8a' },
    { id: 'orange', label: 'Naranja', mine: '#f0e4d0', mineDark: '#3e2a1a', border: '#b8762e' },
    { id: 'pink', label: 'Rosa', mine: '#f0d8e4', mineDark: '#3e1a2a', border: '#8c4a6b' },
    { id: 'gold', label: 'Dorado', mine: '#f0ead0', mineDark: '#3e3418', border: '#8b7a14' },
];

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
    const [showGroupEdit, setShowGroupEdit] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupAvatar, setEditGroupAvatar] = useState('');
    const [savingGroup, setSavingGroup] = useState(false);
    const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [myMood, setMyMood] = useState('');
    const [showTonePicker, setShowTonePicker] = useState(false);
    const [selectedTone, setSelectedTone] = useState('normal');
    const [myBubbleColor, setMyBubbleColor] = useState('green');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupAvatarInputRef = useRef<HTMLInputElement>(null);
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
            const { data: p } = await supabase.from('profiles').select('full_name, avatar_url, email, bubble_color, mood').eq('id', msg.user_id).single();
            if (p) profile = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url, bubble_color: p.bubble_color || 'green', mood: p.mood || '' };
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
        if (msg.user_id !== user?.id) {
            setTypingUser(null); markAsRead();
            if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                const senderName = profile?.full_name || 'Alguien';
                const body = msg.content || (msg.media_url?.endsWith('.webm') ? '🎤 Nota de voz' : '📷 Imagen');
                try { new Notification(`💬 ${senderName}`, { body, icon: '/icon-192.png', tag: 'chat_' + msg.id, requireInteraction: true }); } catch {}
            }
        }
    }, [user]);

    useEffect(() => { if (user && roomId) fetchRoom(); }, [user, roomId]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) { setPushEnabled(false); return; }
        setPushEnabled(Notification.permission === 'granted');
    }, []);

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

    const fetchRoom = async () => { const { data } = await supabase.from('chat_rooms').select('id, name, is_group, family_id, avatar_url').eq('id', roomId).single(); if (data) { setRoom(data); fetchRoomProfiles(data.id); } };
    const fetchRoomProfiles = async (rId: string) => { const { data: members } = await supabase.from('chat_room_members').select('user_id').eq('room_id', rId); if (!members || members.length === 0) return; const ids = members.map(m => m.user_id); const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email, bubble_color, mood').in('id', ids); if (profs) { const map: Record<string, Profile> = {}; profs.forEach((p: any) => { map[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url, bubble_color: p.bubble_color || 'green', mood: p.mood || '' }; }); setProfiles(map); if (user && map[user.id]) { setMyBubbleColor(map[user.id].bubble_color || 'green'); setMyMood(map[user.id].mood || ''); } } };
    const fetchReadStatus = async () => { if (!room) return; const { data } = await supabase.from('chat_read_status').select('user_id, last_read_at').eq('family_id', room.family_id); if (data) { const map: Record<string, string> = {}; data.forEach((r: any) => { map[r.user_id] = r.last_read_at; }); setReadTimes(map); } };
    const fetchMessages = async () => {
        const { data } = await supabase.from('family_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200);
        if (!data || data.length === 0) { setMessages([]); return; }
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, email, bubble_color, mood').in('id', userIds);
        const profMap: Record<string, Profile> = {}; if (profs) profs.forEach((p: any) => { profMap[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Usuario', avatar_url: p.avatar_url, bubble_color: p.bubble_color || 'green', mood: p.mood || '' }; });
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
        const tone = selectedTone !== 'normal' ? selectedTone : undefined;
        const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: text, created_at: new Date().toISOString(), profile: profiles[user.id] || null, reactions: [], reply_to: replyId, tone, reply_message: replyingTo ? { content: replyingTo.content, user_id: replyingTo.user_id, profile_name: replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name } : null };
        setMessages(prev => [...prev, optimistic]); setReplyingTo(null); setSelectedTone('normal');
        const payload: any = { family_id: room.family_id, room_id: room.id, user_id: user.id, content: text }; if (replyId) payload.reply_to = replyId; if (tone) payload.tone = tone;
        const { data: inserted, error } = await supabase.from('family_messages').insert(payload).select('*').single();
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        else if (inserted) {
            broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted });
            sendChatPush(text);
        }
        setSending(false); inputRef.current?.focus();
    };

    const sendChatPush = (preview: string) => {
        if (!room) return;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            fetch('/api/push/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ roomId: room.id, roomName: room.name, messagePreview: preview }),
            }).catch(() => {});
        });
    };

    const activatePush = async () => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones'); return; }
        try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { alert('Permiso de notificaciones denegado. Actívalo en los ajustes del navegador.'); return; }
            setPushEnabled(true);
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) { console.error('[push] VAPID key no configurada'); return; }
            const reg = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
                const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
                const raw = atob(b64);
                const arr = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const res = await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                });
                if (res.ok) {
                    new Notification('Quioba Chat', { body: '¡Notificaciones activadas! Recibirás avisos de nuevos mensajes.', icon: '/icon-192.png' });
                }
            }
        } catch (e) { console.error('[push] Error activando:', e); }
    };

    const getToneInfo = (toneId?: string) => TONES.find(t => t.id === toneId) || null;
    const selectMood = async (emoji: string, label: string) => {
        const val = `${emoji} ${label}`;
        setMyMood(val);
        setShowMoodPicker(false);
        if (user) {
            await supabase.from('profiles').update({ mood: val }).eq('id', user.id);
            setProfiles(prev => ({ ...prev, [user.id]: { ...prev[user.id], mood: val } }));
        }
    };
    const clearMood = async () => {
        setMyMood(''); setShowMoodPicker(false);
        if (user) {
            await supabase.from('profiles').update({ mood: '' }).eq('id', user.id);
            setProfiles(prev => ({ ...prev, [user.id]: { ...prev[user.id], mood: '' } }));
        }
    };

    const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' }); audioChunksRef.current = []; mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); }; mediaRecorder.start(); mediaRecorderRef.current = mediaRecorder; setRecording(true); setRecordTime(0); recordTimerRef.current = setInterval(() => { setRecordTime(prev => { if (prev >= MAX_RECORD_SECONDS - 1) { stopAndSendRecording(); return prev; } return prev + 1; }); }, 1000); } catch { /* mic unavailable */ } };
    const cancelRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop()); }; mediaRecorderRef.current.stop(); } if (recordTimerRef.current) clearInterval(recordTimerRef.current); audioChunksRef.current = []; setRecording(false); setRecordTime(0); };
    const stopAndSendRecording = async () => { if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return; if (recordTimerRef.current) clearInterval(recordTimerRef.current); const recorder = mediaRecorderRef.current; recorder.onstop = () => { recorder.stream?.getTracks().forEach(t => t.stop()); const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); if (blob.size < 1000) { setRecording(false); setRecordTime(0); return; } setRecording(false); setRecordTime(0); uploadAndSendAudio(blob); }; recorder.stop(); };
    const uploadAndSendAudio = async (blob: Blob) => { if (!user || !room) return; setSending(true); const fileName = `${room.id}/${user.id}_${Date.now()}.webm`; const { error: uploadError } = await supabase.storage.from('chat-audio').upload(fileName, blob, { contentType: 'audio/webm' }); if (uploadError) { setSending(false); return; } const { data: urlData } = supabase.storage.from('chat-audio').getPublicUrl(fileName); if (!urlData?.publicUrl) { setSending(false); return; } const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] }; setMessages(prev => [...prev, optimistic]); const { data: inserted, error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl }).select('*').single(); if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id)); else if (inserted) { broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted }); sendChatPush('🎤 Nota de voz'); } setSending(false); };
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !user || !room) return; e.target.value = ''; if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return; setUploadingImage(true); const ext = file.name.split('.').pop() || 'jpg'; const fileName = `${room.id}/${user.id}_${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type }); if (uploadError) { setUploadingImage(false); return; } const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName); if (!urlData?.publicUrl) { setUploadingImage(false); return; } const optimistic: Message = { id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(), media_url: urlData.publicUrl, profile: profiles[user.id] || null, reactions: [] }; setMessages(prev => [...prev, optimistic]); const { data: inserted, error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: urlData.publicUrl }).select('*').single(); if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id)); else if (inserted) { broadcastChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: inserted }); sendChatPush('📷 Imagen'); } setUploadingImage(false); };

    const handleLongPressStart = (msgId: string) => { setLongPressTimer(setTimeout(() => setPickerMsgId(msgId), 400)); };
    const handleLongPressEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };
    const isMessageRead = (msg: Message) => { if (msg.user_id !== user?.id) return false; return Object.entries(readTimes).some(([uid, readAt]) => uid !== user?.id && new Date(readAt) >= new Date(msg.created_at)); };
    const getOnlineStatus = () => { const others = Object.keys(onlineUsers).filter(uid => uid !== user?.id); if (others.length === 0) return `${Object.keys(profiles).length} participantes`; if (!room?.is_group && others.length > 0) return 'en línea'; const names = others.map(uid => profiles[uid]?.full_name || 'Usuario').slice(0, 2); return names.join(', ') + ' en línea'; };
    const getRoomTitle = () => { if (room?.is_group) return room.name || 'Grupo'; const otherIds = Object.keys(profiles).filter(id => id !== user?.id); if (otherIds.length > 0) return profiles[otherIds[0]]?.full_name || 'Chat'; return room?.name || 'Chat'; };
    const getRoomAvatar = () => {
        if (room?.is_group) return room.avatar_url ? { full_name: room.name || 'Grupo', avatar_url: room.avatar_url } : null;
        const otherIds = Object.keys(profiles).filter(id => id !== user?.id);
        return otherIds.length > 0 ? profiles[otherIds[0]] : null;
    };

    const openGroupEdit = () => {
        if (!room) return;
        setEditGroupName(room.name || '');
        setEditGroupAvatar(room.avatar_url || '');
        setShowHeaderMenu(false);
        setShowGroupEdit(true);
    };

    const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !room) return;
        e.target.value = '';
        if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return;
        setUploadingGroupAvatar(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `group_avatars/${room.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type });
        if (uploadError) { setUploadingGroupAvatar(false); return; }
        const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        if (urlData?.publicUrl) setEditGroupAvatar(urlData.publicUrl);
        setUploadingGroupAvatar(false);
    };

    const saveGroupSettings = async () => {
        if (!room || !editGroupName.trim()) return;
        setSavingGroup(true);
        const updates: any = { name: editGroupName.trim() };
        if (editGroupAvatar) updates.avatar_url = editGroupAvatar;
        await supabase.from('chat_rooms').update(updates).eq('id', room.id);
        setRoom({ ...room, name: editGroupName.trim(), avatar_url: editGroupAvatar || room.avatar_url });
        setSavingGroup(false);
        setShowGroupEdit(false);
    };

    const bubbleColors = BUBBLE_COLOR_OPTIONS.find(c => c.id === myBubbleColor) || BUBBLE_COLOR_OPTIONS[0];
    const getBubbleColorsForUser = (userId: string) => {
        const prof = profiles[userId];
        const colorId = prof?.bubble_color || 'green';
        return BUBBLE_COLOR_OPTIONS.find(c => c.id === colorId) || BUBBLE_COLOR_OPTIONS[0];
    };

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
                <div className="relative">
                    <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 rounded-full hover:bg-white/10"><MoreVertical className="h-[18px] w-[18px]" /></button>
                    <AnimatePresence>
                        {showHeaderMenu && (
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#1e2a20] rounded-xl shadow-xl border border-[#e9ebe6] dark:border-[#2a4a34] overflow-hidden z-50"
                            >
                                {room?.is_group && (
                                    <button onClick={openGroupEdit} className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] text-[#1a2318] dark:text-[#e0e8e2] hover:bg-[#f4f1ec] dark:hover:bg-[#1a3322] transition-colors">
                                        <Pencil className="h-4 w-4 text-[#1a5c2e]" />
                                        Editar grupo
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Push notification banner */}
            {pushEnabled === false && (
                <button onClick={activatePush} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1a5c2e] text-white text-[13px] font-medium hover:bg-[#1e7a3a] transition-colors">
                    <span>🔔</span> Activa las notificaciones para no perderte mensajes
                </button>
            )}

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
                    const msgBubbleColors = getBubbleColorsForUser(msg.user_id);

                    return (
                        <React.Fragment key={msg.id}>
                            {showSep && (
                                <div className="flex justify-center py-3">
                                    <span className="text-[11px] bg-[#1a5c2e]/8 dark:bg-[#1a5c2e]/20 text-[#1a5c2e] dark:text-[#7ecf6d] px-4 py-1 rounded-full font-medium tracking-wide">{dateSepLabel(msg.created_at)}</span>
                                </div>
                            )}
                            <div
                                id={'msg-' + msg.id}
                                className={`flex items-end gap-1.5 transition-all duration-500 ${isMine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : ''}`}
                                onTouchStart={() => handleLongPressStart(msg.id)}
                                onTouchEnd={handleLongPressEnd}
                                onMouseDown={() => handleLongPressStart(msg.id)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onContextMenu={(e) => { e.preventDefault(); setPickerMsgId(msg.id); }}
                            >
                                {/* Avatar left for others */}
                                {!isMine && (
                                    isFirstInGroup ? (
                                        <div className="relative flex-shrink-0 mb-0.5">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={profile?.avatar_url} />
                                                <AvatarFallback className="bg-[#2d5a3e] text-white text-[9px] font-bold">{profile?.full_name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {profile?.mood && <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">{profile.mood.split(' ')[0]}</span>}
                                        </div>
                                    ) : <div className="w-7 flex-shrink-0" />
                                )}
                                <div className={`relative max-w-[75%] ${hasImageMsg ? 'max-w-[60%]' : ''}`}>
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
                                    <div
                                        className={`relative text-[14.5px] leading-[20px] shadow-sm rounded-2xl ${
                                            hasImageMsg ? 'overflow-hidden' : 'px-3 py-1.5'
                                        } ${isFirstInGroup && isMine ? 'rounded-tr-sm' : ''} ${isFirstInGroup && !isMine ? 'rounded-tl-sm' : ''}`}
                                        style={{ backgroundColor: msgBubbleColors.mine, border: `2px solid ${msgBubbleColors.border}30` }}
                                    >

                                        {/* Tone label */}
                                        {msg.tone && msg.tone !== 'normal' && (() => {
                                            const toneInfo = getToneInfo(msg.tone);
                                            return toneInfo ? (
                                                <div className="text-[10px] font-semibold px-2 py-0.5 -mx-3 -mt-1.5 mb-1 text-center rounded-t-xl"
                                                    style={{ backgroundColor: `${msgBubbleColors.border}18`, color: msgBubbleColors.border }}
                                                >
                                                    {toneInfo.emoji} {toneInfo.label}
                                                </div>
                                            ) : null;
                                        })()}

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
                                {/* Avatar right for mine — clickable for mood */}
                                {isMine && (
                                    isFirstInGroup ? (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoodPicker(true); }} className="relative flex-shrink-0 mb-0.5">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={profiles[user!.id]?.avatar_url} />
                                                <AvatarFallback className="bg-[#2d5a3e] text-white text-[9px] font-bold">{profiles[user!.id]?.full_name?.slice(0, 1)?.toUpperCase() || 'T'}</AvatarFallback>
                                            </Avatar>
                                            {myMood && <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">{myMood.split(' ')[0]}</span>}
                                        </button>
                                    ) : <div className="w-7 flex-shrink-0" />
                                )}
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

            {/* ===== TONE SELECTOR ===== */}
            <AnimatePresence>
                {showTonePicker && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#eae6df] dark:bg-[#141e16] border-t border-[#d4d0c8] dark:border-[#1e2a20]">
                        <div className="px-2 py-2">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className="text-[11px] font-semibold text-[#6b7b6e] uppercase tracking-wider">Entonación</span>
                                <button onClick={() => setShowTonePicker(false)}><X className="h-3.5 w-3.5 text-[#6b7b6e]" /></button>
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                {TONES.map(t => (
                                    <button key={t.id} onClick={() => { setSelectedTone(t.id); setShowTonePicker(false); }}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full whitespace-nowrap text-[12px] font-medium transition-all flex-shrink-0 ${selectedTone === t.id ? 'bg-[#1a5c2e] text-white shadow-sm' : 'bg-white dark:bg-[#1e2a20] text-[#4a5a4e] dark:text-[#a0b0a4] border border-[#e0dcd6] dark:border-[#2a3a2e]'}`}
                                    >
                                        <span>{t.emoji}</span>
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
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
                                <button type="button" onClick={() => setShowTonePicker(!showTonePicker)} className={`py-2.5 ml-0.5 transition-colors flex-shrink-0 text-[18px] ${selectedTone !== 'normal' ? '' : 'opacity-40 hover:opacity-70'}`}>
                                    {TONES.find(t => t.id === selectedTone)?.emoji || '🗣️'}
                                </button>
                                <input ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); broadcastTyping(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={selectedTone !== 'normal' ? `${TONES.find(t => t.id === selectedTone)?.label}...` : "Escribe un mensaje..."} className="flex-1 h-[46px] bg-transparent text-[15px] text-[#1a2318] dark:text-[#e0e8e2] placeholder:text-[#6b7b6e]/60 dark:placeholder:text-[#8a9b8e]/60 outline-none px-2" autoComplete="off" />
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

            {/* ===== Group Edit Modal ===== */}
            <AnimatePresence>
                {showGroupEdit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                        onClick={() => setShowGroupEdit(false)}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white dark:bg-[#162018] w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-[#6b7b6e]/30" />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white">
                                <h2 className="text-[17px] font-medium">Editar grupo</h2>
                                <button onClick={() => setShowGroupEdit(false)} className="p-1.5 rounded-full hover:bg-white/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="px-5 py-6">
                                <div className="flex flex-col items-center mb-6">
                                    <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupAvatarUpload} />
                                    <div className="relative">
                                        {editGroupAvatar ? (
                                            <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-[#1a5c2e]/15">
                                                <img src={editGroupAvatar} alt="" className="h-full w-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] flex items-center justify-center ring-4 ring-[#1a5c2e]/15">
                                                <span className="text-white text-3xl font-semibold">{editGroupName?.slice(0, 1)?.toUpperCase() || 'G'}</span>
                                            </div>
                                        )}
                                        <button onClick={() => groupAvatarInputRef.current?.click()} disabled={uploadingGroupAvatar}
                                            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#1a5c2e] text-white flex items-center justify-center shadow-md hover:bg-[#1e7a3a] transition-colors disabled:opacity-50"
                                        >
                                            {uploadingGroupAvatar ? (
                                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                            ) : <Camera className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-[#8a9b8e] mt-2">Foto del grupo</p>
                                </div>
                                <div className="mb-6">
                                    <label className="text-[12px] font-medium text-[#6b7b6e] uppercase tracking-wider mb-1.5 block">Nombre del grupo</label>
                                    <Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} placeholder="Nombre del grupo"
                                        className="h-11 border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-[#1a5c2e] bg-transparent text-[16px] text-[#1a2318] dark:text-[#e0e8e2] placeholder:text-[#8a9b8e]"
                                        autoFocus
                                    />
                                </div>
                                <button onClick={saveGroupSettings} disabled={savingGroup || !editGroupName.trim()}
                                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white font-medium text-[15px] disabled:opacity-40 hover:from-[#1e7a3a] hover:to-[#22884a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {savingGroup ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (<><Check className="h-4 w-4" strokeWidth={2.5} /> Guardar</>)}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* ===== Mood Picker Modal ===== */}
            <AnimatePresence>
                {showMoodPicker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                        onClick={() => setShowMoodPicker(false)}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white dark:bg-[#162018] w-full max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-[#6b7b6e]/30" />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white">
                                <h2 className="text-[17px] font-medium">¿Cómo te sientes?</h2>
                                <button onClick={() => setShowMoodPicker(false)} className="p-1.5 rounded-full hover:bg-white/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            {myMood && (
                                <button onClick={clearMood} className="mx-4 mt-3 mb-1 flex items-center gap-2 text-[13px] text-red-500 hover:text-red-600 transition-colors">
                                    <X className="h-3.5 w-3.5" /> Quitar estado
                                </button>
                            )}
                            <div className="flex-1 overflow-y-auto px-2 py-2">
                                {MOODS.map(m => {
                                    const isSelected = myMood === `${m.emoji} ${m.label}`;
                                    return (
                                        <button key={m.label} onClick={() => selectMood(m.emoji, m.label)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isSelected ? 'bg-[#1a5c2e]/10' : 'hover:bg-[#1a5c2e]/5'}`}
                                        >
                                            <span className="text-[26px]">{m.emoji}</span>
                                            <span className="flex-1 text-left text-[15px] text-[#1a2318] dark:text-[#e0e8e2]">{m.label}</span>
                                            {isSelected && <Check className="h-5 w-5 text-[#1a5c2e]" strokeWidth={2.5} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop for header menu */}
            {showHeaderMenu && <div className="fixed inset-0 z-[9]" onClick={() => setShowHeaderMenu(false)} />}
        </div>
    );
}
