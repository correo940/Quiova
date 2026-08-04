'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronDown, MessageCircle, Send, CheckCheck, Reply, X, Mic, Square, Play, Pause, ImageIcon, Camera } from 'lucide-react';
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

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];
const MAX_RECORD_SECONDS = 120;

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
function formatDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
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

function EmojiPicker({ onSelect, onClose, onReply }: { onSelect: (e: string) => void; onClose: () => void; onReply: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.8, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-full shadow-xl border px-1.5 py-1 flex gap-0.5 items-center z-30">
            <button onClick={() => { onReply(); onClose(); }} className="p-1 hover:bg-muted rounded-full transition-colors" title="Responder">
                <Reply className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="w-px h-5 bg-border mx-0.5" />
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
        if (playing) { audio.pause(); } else { audio.play(); }
        setPlaying(!playing);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-2 min-w-[180px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            <button onClick={toggle} className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-[#1a5c2e]/10 hover:bg-[#1a5c2e]/20'}`}>
                {playing ? <Pause className={`h-3.5 w-3.5 ${isMine ? 'text-white' : 'text-[#1a5c2e]'}`} /> : <Play className={`h-3.5 w-3.5 ${isMine ? 'text-white' : 'text-[#1a5c2e]'}`} />}
            </button>
            <div className="flex-1 min-w-0">
                <div className={`h-1 rounded-full overflow-hidden ${isMine ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'}`}>
                    <div className={`h-full rounded-full transition-all duration-100 ${isMine ? 'bg-white/70' : 'bg-[#1a5c2e]'}`} style={{ width: `${progress}%` }} />
                </div>
                <p className={`text-[9px] mt-0.5 ${isMine ? 'text-white/50' : 'text-muted-foreground'}`}>
                    {playing || currentTime > 0 ? formatDuration(currentTime) : (duration > 0 ? formatDuration(duration) : '0:00')}
                </p>
            </div>
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
            setRecording(true);
            setRecordTime(0);
            recordTimerRef.current = setInterval(() => {
                setRecordTime(prev => {
                    if (prev >= MAX_RECORD_SECONDS - 1) { stopAndSendRecording(); return prev; }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            // microphone not available
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.stop();
        }
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        audioChunksRef.current = [];
        setRecording(false);
        setRecordTime(0);
    };

    const stopAndSendRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);

        const recorder = mediaRecorderRef.current;
        const sendAudio = async () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (blob.size < 1000) { setRecording(false); setRecordTime(0); return; }
            setRecording(false); setRecordTime(0);
            await uploadAndSendAudio(blob);
        };

        recorder.onstop = () => {
            recorder.stream?.getTracks().forEach(t => t.stop());
            sendAudio();
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
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) { setSending(false); return; }

        const optimistic: Message = {
            id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(),
            media_url: publicUrl, profile: profiles[user.id] || null, reactions: [],
        };
        setMessages(prev => [...prev, optimistic]);
        const { error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: publicUrl });
        if (error) setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setSending(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !room) return;
        e.target.value = '';
        if (!file.type.startsWith('image/')) return;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) return;

        setUploadingImage(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${room.id}/${user.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type });
        if (uploadError) { setUploadingImage(false); return; }
        const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) { setUploadingImage(false); return; }

        const optimistic: Message = {
            id: 'tmp_' + Date.now(), user_id: user.id, content: '', created_at: new Date().toISOString(),
            media_url: publicUrl, profile: profiles[user.id] || null, reactions: [],
        };
        setMessages(prev => [...prev, optimistic]);
        const { error } = await supabase.from('family_messages').insert({ family_id: room.family_id, room_id: room.id, user_id: user.id, content: '', media_url: publicUrl });
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
    const isAudioMessage = (msg: Message) => !!msg.media_url && msg.media_url.endsWith('.webm');
    const isImageMessage = (msg: Message) => !!msg.media_url && !msg.media_url.endsWith('.webm');

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
                    const hasAudio = isAudioMessage(msg);
                    const hasImage = isImageMessage(msg);
                    return (
                        <React.Fragment key={msg.id}>
                            {showSep && <div className="flex justify-center my-4"><span className="text-[10px] bg-white dark:bg-slate-800 px-4 py-1 rounded-lg text-muted-foreground capitalize shadow-sm border">{dateSeparatorLabel(msg.created_at)}</span></div>}
                            <motion.div id={'msg-' + msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={`flex gap-2 transition-all duration-500 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                {!isMine && <div className="w-7 flex-shrink-0 self-end">{showAvatar && profile && <Avatar className="h-7 w-7 ring-2 ring-background"><AvatarImage src={profile.avatar_url} /><AvatarFallback className="text-[10px] bg-[#1a5c2e] text-white">{profile.full_name?.slice(0, 1)?.toUpperCase() || '?'}</AvatarFallback></Avatar>}</div>}
                                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                                    {showMyName && <p className="text-[10px] font-medium text-[#1a5c2e] mr-2 mb-0.5 text-right">Yo</p>}
                                    {showAvatar && !isMine && profile && <p className="text-[10px] font-medium text-[#1a5c2e] ml-1 mb-0.5">{profile.full_name}</p>}
                                    <div className="relative" onTouchStart={() => handleLongPressStart(msg.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(msg.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd} onContextMenu={(e) => { e.preventDefault(); setPickerMsgId(msg.id); }}>
                                        <AnimatePresence>{pickerMsgId === msg.id && <EmojiPicker onSelect={(emoji) => toggleReaction(msg.id, emoji)} onClose={() => setPickerMsgId(null)} onReply={() => { setReplyingTo(msg); inputRef.current?.focus(); }} />}</AnimatePresence>
                                        <div className={`relative rounded-2xl px-3 py-1.5 text-sm break-words shadow-sm select-none ${isMine ? 'bg-[#1a5c2e] text-white rounded-tr-md' : 'bg-white dark:bg-slate-800 rounded-tl-md border border-border/50'}`}>
                                            {showTail && <BubbleTail side={isMine ? 'right' : 'left'} />}
                                            {msg.reply_message && (
                                                <div
                                                    className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] cursor-pointer ${isMine ? 'bg-white/10 border-l-white/50' : 'bg-slate-100 dark:bg-slate-700/50 border-l-[#1a5c2e]'}`}
                                                    onClick={(e) => {
                                                        e.preventDefault(); e.stopPropagation();
                                                        if (msg.reply_to) {
                                                            const el = document.getElementById('msg-' + msg.reply_to);
                                                            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-[#1a5c2e]/40', 'rounded-2xl'); setTimeout(() => el.classList.remove('ring-2', 'ring-[#1a5c2e]/40', 'rounded-2xl'), 2000); }
                                                        }
                                                    }}
                                                >
                                                    <p className={`text-[10px] font-semibold ${isMine ? 'text-white/80' : 'text-[#1a5c2e]'}`}>
                                                        {msg.reply_message.user_id === user?.id ? 'Yo' : (msg.reply_message.profile_name || 'Usuario')}
                                                    </p>
                                                    <p className={`text-[11px] truncate ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                                                        {msg.reply_message.content.length > 60 ? msg.reply_message.content.slice(0, 60) + '…' : msg.reply_message.content}
                                                    </p>
                                                </div>
                                            )}
                                            {hasAudio ? (
                                                <AudioPlayer url={msg.media_url!} isMine={isMine} />
                                            ) : isImageMessage(msg) ? (
                                                <div className="cursor-pointer -mx-1.5 -mt-0.5 mb-0.5" onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.media_url!); }}>
                                                    <img src={msg.media_url!} alt="" className="rounded-lg max-w-[240px] max-h-[280px] object-cover" loading="lazy" />
                                                    {msg.content && <p className="whitespace-pre-wrap leading-relaxed mt-1">{msg.content}</p>}
                                                </div>
                                            ) : (
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            )}
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

            {/* Input area */}
            <div className="border-t bg-background/95 backdrop-blur sticky bottom-0">
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                <div className="flex-1 pl-3 border-l-[3px] border-l-[#1a5c2e] min-w-0">
                                    <p className="text-[11px] font-semibold text-[#1a5c2e]">
                                        {replyingTo.user_id === user?.id ? 'Yo' : (replyingTo.profile?.full_name || profiles[replyingTo.user_id]?.full_name || 'Usuario')}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground truncate">{replyingTo.content || 'Nota de voz'}</p>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="p-2">
                    <AnimatePresence mode="wait">
                        {recording ? (
                            <motion.div
                                key="recording"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center gap-3 h-10"
                            >
                                <button
                                    onClick={cancelRecording}
                                    className="h-10 w-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 transition-colors flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="flex-1 flex items-center gap-2">
                                    <motion.div
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"
                                    />
                                    <span className="text-sm font-medium text-red-500 tabular-nums">{formatDuration(recordTime)}</span>
                                    <div className="flex-1 flex items-center gap-0.5">
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{ height: [3, Math.random() * 16 + 4, 3] }}
                                                transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }}
                                                className="w-1 bg-red-400/60 rounded-full"
                                                style={{ height: 3 }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{formatDuration(MAX_RECORD_SECONDS - recordTime)}</span>
                                </div>
                                <button
                                    onClick={stopAndSendRecording}
                                    className="h-10 w-10 rounded-full flex items-center justify-center bg-[#1a5c2e] text-white shadow-md hover:bg-[#1e7a3a] transition-colors active:scale-90 flex-shrink-0"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="input"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2 items-end"
                            >
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage} className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0 disabled:opacity-50">
                                    <ImageIcon className="h-5 w-5" />
                                </button>
                                <Input ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); broadcastTyping(); }} placeholder="Escribe un mensaje..." className="flex-1 rounded-full h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-[#1a5c2e]" autoComplete="off" />
                                {input.trim() ? (
                                    <Button type="submit" size="icon" disabled={sending} className="rounded-full h-10 w-10 bg-[#1a5c2e] hover:bg-[#1e7a3a] shadow-md transition-transform active:scale-90"><Send className="h-4 w-4" /></Button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        disabled={sending}
                                        className="rounded-full h-10 w-10 bg-[#1a5c2e] hover:bg-[#1e7a3a] shadow-md transition-transform active:scale-90 flex items-center justify-center text-white disabled:opacity-50"
                                    >
                                        <Mic className="h-4 w-4" />
                                    </button>
                                )}
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Image preview modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                            <X className="h-5 w-5" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            src={previewImage}
                            alt=""
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
