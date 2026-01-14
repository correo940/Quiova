'use client';

import { useState } from 'react';
import { Send, Mic, Video, Type, Square, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Props = {
    onSend: (type: 'text' | 'audio' | 'video', content: string) => Promise<void>;
    disabled?: boolean;
    placeholder?: string;
};

export function MessageComposer({ onSend, disabled, placeholder }: Props) {
    const [activeTab, setActiveTab] = useState<'text' | 'audio' | 'video'>('text');
    const [textContent, setTextContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const handleSendText = async () => {
        if (!textContent.trim()) return;

        setIsSending(true);
        try {
            await onSend('text', textContent.trim());
            setTextContent('');
            toast.success('Mensaje enviado');
        } catch (error) {
            toast.error('Error al enviar');
        } finally {
            setIsSending(false);
        }
    };

    const startRecording = async (type: 'audio' | 'video') => {
        try {
            const constraints = type === 'audio'
                ? { audio: true }
                : { audio: true, video: { facingMode: 'user' } };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: `${type}/webm` });
                setMediaBlob(blob);
                setMediaUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            toast.error(`Error al acceder a ${type === 'audio' ? 'micrófono' : 'cámara'}`);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
        }
    };

    const sendMedia = async () => {
        if (!mediaBlob) return;

        setIsSending(true);
        try {
            const type = activeTab;
            const fileName = `public/${Date.now()}_${type}.webm`;

            const { error: uploadError } = await supabase.storage
                .from('confessions')
                .upload(fileName, mediaBlob);

            if (uploadError) throw uploadError;

            await onSend(type, fileName);
            setMediaBlob(null);
            setMediaUrl(null);
            toast.success(`${type === 'audio' ? 'Audio' : 'Video'} enviado`);
        } catch (error) {
            toast.error('Error al enviar');
        } finally {
            setIsSending(false);
        }
    };

    const deleteMedia = () => {
        setMediaBlob(null);
        setMediaUrl(null);
    };

    return (
        <div className="p-4 bg-background">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3 mb-3">
                    <TabsTrigger value="text" disabled={disabled}>
                        <Type className="w-4 h-4 mr-2" />
                        Texto
                    </TabsTrigger>
                    <TabsTrigger value="audio" disabled={disabled}>
                        <Mic className="w-4 h-4 mr-2" />
                        Audio
                    </TabsTrigger>
                    <TabsTrigger value="video" disabled={disabled}>
                        <Video className="w-4 h-4 mr-2" />
                        Video
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="text">
                    <div className="flex gap-2">
                        <Textarea
                            placeholder={disabled ? "Conversación pausada..." : (placeholder || "Escribe tu mensaje...")}
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendText();
                                }
                            }}
                            disabled={disabled || isSending}
                            className="min-h-[60px]"
                        />
                        <Button
                            onClick={handleSendText}
                            disabled={disabled || !textContent.trim() || isSending}
                            size="icon"
                            className="h-[60px] w-[60px]"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="audio">
                    <div className="border rounded-lg p-4 space-y-3">
                        {!mediaUrl ? (
                            <Button
                                onClick={() => isRecording ? stopRecording() : startRecording('audio')}
                                disabled={disabled}
                                variant={isRecording ? 'destructive' : 'default'}
                                className="w-full"
                            >
                                {isRecording ? (
                                    <>
                                        <Square className="w-4 h-4 mr-2" />
                                        Detener
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-4 h-4 mr-2" />
                                        Grabar Audio
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <audio controls src={mediaUrl} className="w-full" />
                                <div className="flex gap-2">
                                    <Button onClick={sendMedia} disabled={isSending} className="flex-1">
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar
                                    </Button>
                                    <Button onClick={deleteMedia} variant="outline" size="icon">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="video">
                    <div className="border rounded-lg p-4 space-y-3">
                        <p className="text-sm text-center text-muted-foreground">
                            Función de video disponible próximamente
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

            {disabled && (
                <p className="text-xs text-center text-orange-600 mt-2">
                    La conversación está pausada
                </p>
            )}
        </div>
    );
}
