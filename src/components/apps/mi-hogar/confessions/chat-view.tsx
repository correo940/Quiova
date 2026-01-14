'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pause, Send, Mic, Video, Type, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageComposer } from './message-composer';
import { PauseDialog } from './pause-dialog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type Message = {
    id: string;
    sender_id: string;
    type: 'text' | 'audio' | 'video';
    content: string;
    created_at: string;
    read_at: string | null;
};

type Props = {
    conversationId: string;
    userId: string;
};

export function ChatView({ conversationId, userId }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseInfo, setPauseInfo] = useState<any>(null);
    const [showPauseDialog, setShowPauseDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversationData();

        // Real-time messages
        const channel = supabase
            .channel(`messages_${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const fetchConversationData = async () => {
        setIsLoading(true);

        // Fetch conversation metadata and participant info
        const { data: convData } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_participants!inner (
                    user_id_1,
                    user_id_2
                )
            `)
            .eq('id', conversationId)
            .single();

        if (!convData) {
            setIsLoading(false);
            return;
        }

        // Determine other user
        const participant = convData.conversation_participants;
        const otherUserId = participant.user_id_1 === userId
            ? participant.user_id_2
            : participant.user_id_1;

        // Fetch other user email (you might need to create this RPC or query profiles table)
        const { data: userEmail } = await supabase
            .rpc('get_user_email', { user_id: otherUserId });

        setOtherUser({
            id: otherUserId,
            email: userEmail || 'Usuario'
        });

        // Fetch messages
        const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        // For media messages, generate signed URLs
        const enrichedMessages = await Promise.all(
            (messagesData || []).map(async (msg: any) => {
                if (msg.type === 'audio' || msg.type === 'video') {
                    const { data: signedUrl } = await supabase.storage
                        .from('confessions')
                        .createSignedUrl(msg.content, 3600); // 1 hour

                    return {
                        ...msg,
                        content: signedUrl?.signedUrl || msg.content
                    };
                }
                return msg;
            })
        );

        setMessages(enrichedMessages);

        // Check for active pause
        const { data: pauseData } = await supabase
            .from('conversation_pauses')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('is_active', true)
            .gt('resume_at', new Date().toISOString())
            .single();

        setIsPaused(!!pauseData);
        setPauseInfo(pauseData);

        // Mark messages as read
        if (messagesData && messagesData.length > 0) {
            await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId)
                .is('read_at', null);
        }

        setIsLoading(false);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    };

    const handleSendMessage = async (type: 'text' | 'audio' | 'video', content: string) => {
        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: userId,
                type,
                content
            });

        if (error) {
            console.error('Error sending message:', error);
        }
    };

    const handlePause = async (duration: number, reason?: string) => {
        const resumeAt = new Date();
        resumeAt.setHours(resumeAt.getHours() + duration);

        const { error } = await supabase
            .from('conversation_pauses')
            .insert({
                conversation_id: conversationId,
                paused_by: userId,
                resume_at: resumeAt.toISOString(),
                reason
            });

        if (!error) {
            setIsPaused(true);
            setShowPauseDialog(false);
            fetchConversationData();
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando conversación...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {otherUser?.email?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-semibold">{otherUser?.email || 'Usuario'}</h2>
                        {isPaused && pauseInfo && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                                <Clock className="w-3 h-3" />
                                Pausada hasta {new Date(pauseInfo.resume_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>
                {!isPaused && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPauseDialog(true)}
                    >
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                    </Button>
                )}
            </div>

            {/* Pause Alert */}
            {isPaused && pauseInfo && (
                <Alert className="m-4 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm">
                        <strong>{pauseInfo.paused_by === userId ? 'Tú' : otherUser?.email}</strong> pausó esta conversación.
                        {pauseInfo.reason && ` Motivo: "${pauseInfo.reason}"`}
                        <br />
                        Se reanudará automáticamente el {new Date(pauseInfo.resume_at).toLocaleString()}.
                    </AlertDescription>
                </Alert>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            <p className="text-sm">No hay mensajes aún.</p>
                            <p className="text-xs mt-1">¡Sé el primero en compartir tus pensamientos!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-3 ${msg.sender_id === userId
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    {msg.type === 'text' && (
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                    {msg.type === 'audio' && (
                                        <div className="flex items-center gap-2">
                                            <Mic className="w-4 h-4" />
                                            <audio controls src={msg.content} className="max-w-full" />
                                        </div>
                                    )}
                                    {msg.type === 'video' && (
                                        <video controls src={msg.content} className="max-w-full rounded" />
                                    )}
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {formatDistanceToNow(new Date(msg.created_at), {
                                            addSuffix: true,
                                            locale: es
                                        })}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Message Composer */}
            <MessageComposer
                onSend={handleSendMessage}
                disabled={isPaused}
            />

            {/* Pause Dialog */}
            <PauseDialog
                isOpen={showPauseDialog}
                onClose={() => setShowPauseDialog(false)}
                onConfirm={handlePause}
            />
        </div>
    );
}
