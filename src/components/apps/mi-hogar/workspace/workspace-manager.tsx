'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Lightbulb, FileCode, Calendar as CalendarIcon, Sparkles,
  Mic, MicOff, Play, Square, Trash2, Copy, Plus, Search, Video,
  CheckCircle2, AlertCircle, Volume2, ArrowRight, Lock, Save, Download, Upload, ClipboardCheck,
  ChevronLeft, ChevronRight, Check, X, FileText, Share2, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Definición de Interfaces
interface Idea {
  id: string;
  title: string;
  category: 'cuerpo' | 'mente' | 'finanzas' | 'general';
  description: string;
  format: 'short' | 'video-largo' | 'post';
  status: 'pendiente' | 'en-progreso' | 'completado';
  usada: boolean;
  audioBase64?: string;
  createdAt: string;
}

interface PromptTemplate {
  id: string;
  title: string;
  category: 'cuerpo' | 'mente' | 'finanzas' | 'general';
  tipo: 'video' | 'articulo' | 'guion' | 'redes';
  content: string;
  isCustom: boolean;
}

interface WorkBlock {
  id: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  time: string; // Ej: "09:00 - 10:30"
  title: string;
  category: 'cuerpo' | 'mente' | 'finanzas' | 'general';
  semana: string; // Formato: "YYYY-WXX"
  fecha: string;  // Formato: "YYYY-MM-DD"
  type: 'planificacion' | 'escritura' | 'grabacion' | 'edicion';
  status: 'pendiente' | 'en-progreso' | 'completado';
}

interface WorkspaceData {
  ideas: Idea[];
  prompts: PromptTemplate[];
  blocks: WorkBlock[];
  config?: {
    passwordHash: string | null;
  };
}

export default function WorkspaceManager() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ideas' | 'prompts' | 'calendar' | 'asistente' | 'copilot'>('dashboard');
  const [data, setData] = useState<WorkspaceData>({ ideas: [], prompts: [], blocks: [], config: { passwordHash: null } });
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(true); // Indica si está sincronizando con el archivo de Next.js
  const [saving, setSaving] = useState(false);

  // States para Ideas
  const [searchIdea, setSearchIdea] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState<'cuerpo' | 'mente' | 'finanzas' | 'general'>('mente');
  const [newIdeaFormat, setNewIdeaFormat] = useState<'short' | 'video-largo' | 'post'>('short');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [quickIdeaText, setQuickIdeaText] = useState('');
  
  // Grabadora de voz y dictado
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // States para Prompts
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState<'cuerpo' | 'mente' | 'finanzas' | 'general'>('mente');
  const [newPromptTipo, setNewPromptTipo] = useState<'video' | 'articulo' | 'guion' | 'redes'>('video');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [filterPromptCategory, setFilterPromptCategory] = useState<string>('all');
  const [filterPromptTipo, setFilterPromptTipo] = useState<string>('all');

  // States para Bloques (Planificador Semanal)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [selectedDateForNewBlock, setSelectedDateForNewBlock] = useState('');
  const [newBlockDay, setNewBlockDay] = useState<WorkBlock['day']>('Lunes');
  const [newBlockTime, setNewBlockTime] = useState('09:00 - 10:30');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockCategory, setNewBlockCategory] = useState<WorkBlock['category']>('general');
  const [newBlockType, setNewBlockType] = useState<WorkBlock['type']>('planificacion');

  // States para Claude Asistente
  const [claudeTask, setClaudeTask] = useState<string>('planificar');
  const [claudeCustomText, setClaudeCustomText] = useState<string>('');
  const [copiedContext, setCopiedContext] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    loadWorkspaceData();
    initSpeechRecognition();
  }, []);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
        setIsLocalMode(true);
      } else {
        throw new Error('API no disponible localmente.');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo cargar la API de Quioba Studios. Cargando desde LocalStorage.');
      setIsLocalMode(false);
      const localStored = localStorage.getItem('quioba_studios_data');
      if (localStored) {
        setData(JSON.parse(localStored));
      } else {
        setData({ ideas: [], prompts: [], blocks: [], config: { passwordHash: null } });
      }
    } finally {
      setLoading(false);
    }
  };

  // Guardar datos
  const saveWorkspaceData = async (updatedData: WorkspaceData) => {
    setData(updatedData);
    if (isLocalMode) {
      setSaving(true);
      try {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        if (!res.ok) throw new Error('Error al guardar.');
        toast.success('Cambios guardados en content/workspace-data.json');
      } catch (err) {
        toast.error('Error al sincronizar con el disco local.');
      } finally {
        setSaving(false);
      }
    } else {
      localStorage.setItem('quioba_studios_data', JSON.stringify(updatedData));
      toast.success('Guardado localmente en tu navegador');
    }
  };

  // Inicializar Reconocimiento de Voz nativo
  const initSpeechRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'es-ES';
        
        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const text = finalTranscript || interimTranscript;
          setSpeechText(text);
          if (finalTranscript) {
            setNewIdeaDesc(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
          }
        };

        rec.onerror = (e: any) => {
          console.error('Error en reconocimiento de voz:', e);
          setIsTranscribing(false);
        };

        rec.onend = () => {
          setIsTranscribing(false);
        };

        recognitionRef.current = rec;
      }
    }
  };

  // Grabador de notas de voz
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      if (recognitionRef.current) {
        setSpeechText('');
        setIsTranscribing(true);
        recognitionRef.current.start();
      }

      toast.info('Grabando audio e iniciando dictado...');
    } catch (e) {
      console.error('No se pudo acceder al micrófono:', e);
      toast.error('Permiso de micrófono denegado o no disponible.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current && isTranscribing) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }
    toast.success('Audio y dictado capturados.');
  };

  // Crear una nueva idea
  const handleAddIdea = () => {
    if (!newIdeaTitle.trim()) {
      toast.error('El título es requerido.');
      return;
    }

    const newIdea: Idea = {
      id: `idea-${Date.now()}`,
      title: newIdeaTitle,
      category: newIdeaCategory,
      description: newIdeaDesc.trim(),
      format: newIdeaFormat,
      status: 'pendiente',
      usada: false,
      audioBase64: audioBase64 || undefined,
      createdAt: new Date().toISOString()
    };

    const updatedData = {
      ...data,
      ideas: [newIdea, ...data.ideas]
    };

    saveWorkspaceData(updatedData);

    // Resetear formulario
    setNewIdeaTitle('');
    setNewIdeaDesc('');
    setAudioBase64('');
    setAudioBlob(null);
    setSpeechText('');
    toast.success('¡Idea guardada en Quioba Studios!');
  };

  // Crear idea rápida desde el Dashboard
  const handleAddQuickIdea = () => {
    if (!quickIdeaText.trim()) return;

    const newIdea: Idea = {
      id: `idea-${Date.now()}`,
      title: quickIdeaText.trim(),
      category: 'general',
      description: '',
      format: 'short',
      status: 'pendiente',
      usada: false,
      createdAt: new Date().toISOString()
    };

    const updatedData = {
      ...data,
      ideas: [newIdea, ...data.ideas]
    };

    saveWorkspaceData(updatedData);
    setQuickIdeaText('');
    toast.success('¡Idea rápida anotada!');
  };

  // Borrar idea
  const handleDeleteIdea = (id: string) => {
    const updatedData = {
      ...data,
      ideas: data.ideas.filter(idea => idea.id !== id)
    };
    saveWorkspaceData(updatedData);
    toast.success('Idea eliminada.');
  };

  // Cambiar estado de uso de la idea (Marcar como usada/Sin usar)
  const handleToggleIdeaUsage = (id: string) => {
    const updatedData = {
      ...data,
      ideas: data.ideas.map(idea => {
        if (idea.id === id) {
          return { ...idea, usada: !idea.usada };
        }
        return idea;
      })
    };
    saveWorkspaceData(updatedData);
    toast.info('Estado de uso de la idea actualizado.');
  };

  // Crear prompt personalizado
  const handleAddPrompt = () => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) {
      toast.error('Título y contenido del prompt requeridos.');
      return;
    }

    const newPrompt: PromptTemplate = {
      id: `prompt-${Date.now()}`,
      title: newPromptTitle,
      category: newPromptCategory,
      tipo: newPromptTipo,
      content: newPromptContent,
      isCustom: true
    };

    const updatedData = {
      ...data,
      prompts: [...data.prompts, newPrompt]
    };

    saveWorkspaceData(updatedData);

    setNewPromptTitle('');
    setNewPromptContent('');
    toast.success('Prompt añadido a Quioba Studios.');
  };

  // Eliminar prompt
  const handleDeletePrompt = (id: string) => {
    const updatedData = {
      ...data,
      prompts: data.prompts.filter(p => p.id !== id)
    };
    saveWorkspaceData(updatedData);
    toast.success('Prompt eliminado.');
  };

  // Copiar prompt
  const copyPromptToClipboard = (prompt: PromptTemplate) => {
    navigator.clipboard.writeText(prompt.content);
    setCopiedPromptId(prompt.id);
    toast.success('¡Prompt copiado al portapapeles!');
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Abrir prompt directo en Claude.ai
  const handleOpenPromptInClaude = (prompt: PromptTemplate) => {
    const url = 'https://claude.ai/new?q=' + encodeURIComponent(prompt.content);
    window.open(url, '_blank');
    toast.success('Abriendo Claude.ai con el prompt...');
  };

  // Helpers para manejo de semanas del planificador
  const getWeekDays = (offset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    // Calcular el lunes de la semana actual
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const getWeekId = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };

  const weekDays = getWeekDays(currentWeekOffset);
  const weekId = getWeekId(weekDays[0]);

  // Abrir modal para añadir bloque a un día específico
  const openModalTareaDia = (dateStr: string) => {
    setSelectedDateForNewBlock(dateStr);
    
    // Obtener qué día de la semana corresponde
    const dateObj = new Date(dateStr);
    const dayIndex = dateObj.getDay(); // 0 es Domingo, 1 es Lunes...
    const dayNamesMap: WorkBlock['day'][] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    setNewBlockDay(dayNamesMap[dayIndex]);
    
    setShowAddBlockModal(true);
  };

  // Crear bloque de tiempo
  const handleAddBlock = () => {
    if (!newBlockTitle.trim()) {
      toast.error('El título del bloque es requerido.');
      return;
    }

    const newBlock: WorkBlock = {
      id: `block-${Date.now()}`,
      day: newBlockDay,
      time: newBlockTime,
      title: newBlockTitle,
      category: newBlockCategory,
      semana: weekId,
      fecha: selectedDateForNewBlock || new Date().toISOString().split('T')[0],
      type: newBlockType,
      status: 'pendiente'
    };

    const updatedData = {
      ...data,
      blocks: [...data.blocks, newBlock]
    };

    saveWorkspaceData(updatedData);
    setNewBlockTitle('');
    setShowAddBlockModal(false);
    toast.success('Bloque añadido a la agenda.');
  };

  // Borrar bloque
  const handleDeleteBlock = (id: string) => {
    const updatedData = {
      ...data,
      blocks: data.blocks.filter(b => b.id !== id)
    };
    saveWorkspaceData(updatedData);
    toast.success('Bloque de trabajo eliminado.');
  };

  // Cambiar estado de bloque
  const handleToggleBlockStatus = (id: string) => {
    const updatedData = {
      ...data,
      blocks: data.blocks.map(block => {
        if (block.id === id) {
          const nextStatus: Record<WorkBlock['status'], WorkBlock['status']> = {
            'pendiente': 'en-progreso',
            'en-progreso': 'completado',
            'completado': 'pendiente'
          };
          return { ...block, status: nextStatus[block.status] };
        }
        return block;
      })
    };
    saveWorkspaceData(updatedData);
  };

  // --- Lógica del Asistente Claude ---
  const generateClaudeContextSummary = () => {
    const totalIdeas = data.ideas?.length || 0;
    const unusedIdeas = data.ideas?.filter(i => !i.usada) || [];
    const totalPrompts = data.prompts?.length || 0;
    const thisWeekBlocks = data.blocks?.filter(b => b.semana === weekId) || [];
    const completedBlocksCount = thisWeekBlocks.filter(b => b.status === 'completado').length;

    return `Eres mi asistente experto de producción de contenido para mi plataforma Quioba Studios (especializada en Cuerpo, Mente, Finanzas Personales y Familiares).

Tengo las siguientes estadísticas y datos guardados de mi estudio creativo:
- Ideas guardadas totales: ${totalIdeas} (${unusedIdeas.length} sin usar).
- Prompts de videos guardados en biblioteca: ${totalPrompts}.
- Bloques de trabajo para esta semana (${weekId}): ${completedBlocksCount} de ${thisWeekBlocks.length} completados.

Mis últimas ideas guardadas SIN USAR son:
${unusedIdeas.slice(0, 5).map((i, index) => `${index + 1}. [${i.category.toUpperCase()}] ${i.title}${i.description ? `: ${i.description}` : ''}`).join('\n') || '(Ninguna registrada)'}

Mi lista de prompts en biblioteca:
${data.prompts?.slice(0, 3).map((p) => `- [${p.tipo.toUpperCase()}] ${p.title}`).join('\n') || '(Ninguna registrada)'}`;
  };

  const handleOpenInClaude = () => {
    const summary = generateClaudeContextSummary();
    const taskTexts: Record<string, string> = {
      planificar: 'Ayúdame a planificar mi semana de contenido para Quioba Studios. Sugiere bloques específicos y una distribución equilibrada de Cuerpo, Mente y Finanzas.',
      ideas: 'Por favor, desarrolla mis ideas pendientes de usar. Dame ideas para ganchos (hooks) de video y 3 propuestas de títulos virales para cada una.',
      prompt: 'Crea un prompt estructurado y detallado para que yo pueda pasárselo a un editor o a una IA de video para producir contenido sobre mi idea de Cuerpo/Mente/Finanzas.',
      guion: 'Escribe el guion literario y técnico completo (de 60 segundos) de un Short/Reel para mi primera idea pendiente.',
      titulo: 'Analiza mis ideas y genera 10 títulos creativos de alto impacto diseñados para enganchar en los primeros 2 segundos.',
      custom: claudeCustomText || 'Ayúdame a planificar mi producción de contenidos.'
    };

    const selectedText = taskTexts[claudeTask] || taskTexts.planificar;
    const fullPrompt = `${summary}\n\n---\n🎯 Tarea que quiero que realices ahora:\n${selectedText}\n\nResponde en español, con un tono dinámico, profesional y altamente creativo.`;

    const url = 'https://claude.ai/new?q=' + encodeURIComponent(fullPrompt);
    window.open(url, '_blank');
    toast.success('Abriendo Claude.ai con tu contexto enriquecido.');
  };

  const copyContextToClipboard = () => {
    const summary = generateClaudeContextSummary();
    navigator.clipboard.writeText(summary);
    setCopiedContext(true);
    toast.success('Contexto copiado. ¡Puedes pegarlo directamente en Claude o ChatGPT!');
    setTimeout(() => setCopiedContext(false), 2000);
  };

  // Exportar copia de respaldo en JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quioba-studios-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Copia de seguridad de Quioba Studios descargada.');
  };

  // Importar copia de respaldo en JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData.ideas) && Array.isArray(importedData.prompts) && Array.isArray(importedData.blocks)) {
          saveWorkspaceData(importedData);
          toast.success('Datos de Quioba Studios importados correctamente.');
        } else {
          toast.error('Formato de archivo JSON inválido.');
        }
      } catch (err) {
        toast.error('Error al analizar el archivo de base de datos.');
      }
    };
    reader.readAsText(file);
  };

  // Ayudantes de Renderizado y Estilos
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'cuerpo': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'mente': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'finanzas': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'planificacion': return 'bg-blue-50 text-blue-750 border border-blue-200/80';
      case 'escritura': return 'bg-pink-50 text-pink-700 border border-pink-200';
      case 'grabacion': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'edicion': return 'bg-violet-50 text-violet-750 border border-violet-200';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'short': return '🎥 Short/Reel';
      case 'video-largo': return '📺 Vídeo Largo';
      case 'post': return '✍️ Post Redes';
      default: return format;
    }
  };

  const filteredIdeas = data.ideas?.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchIdea.toLowerCase()) || 
                          idea.description.toLowerCase().includes(searchIdea.toLowerCase());
    const matchesCategory = filterCategory === 'all' || idea.category === filterCategory;
    const matchesType = filterType === 'all' 
      ? true 
      : filterType === 'usadas' 
        ? idea.usada 
        : !idea.usada;
    return matchesSearch && matchesCategory && matchesType;
  }) || [];

  const filteredPrompts = data.prompts?.filter(prompt => {
    const matchesCategory = filterPromptCategory === 'all' || prompt.category === filterPromptCategory;
    const matchesTipo = filterPromptTipo === 'all' || prompt.tipo === filterPromptTipo;
    return matchesCategory && matchesTipo;
  }) || [];

  // Datos para renderizar la semana
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dayNamesShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Estadísticas rápidas calculadas
  const totalIdeasCount = data.ideas?.length || 0;
  const unusedIdeasCount = data.ideas?.filter(i => !i.usada).length || 0;
  const totalPromptsCount = data.prompts?.length || 0;
  const thisWeekBlocks = data.blocks?.filter(b => b.semana === weekId) || [];
  const completedThisWeekCount = thisWeekBlocks.filter(b => b.status === 'completado').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden selection:bg-emerald-100 pb-20">
      {/* Background Orbs */}
      <div className="absolute top-[-30%] right-[-10%] w-[90%] h-[60%] rounded-full bg-emerald-100/40 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[90%] h-[60%] rounded-full bg-blue-100/30 blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[50%] h-[40%] rounded-full bg-amber-100/20 blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 z-10">
        
        {/* Top Header Panel */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
                  Quioba Studios
                </h1>
                <p className="text-xs text-slate-500 font-bold">Panel de Producción e Ideas Unificado</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Sync State Badge */}
            <div className={`px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
              isLocalMode 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLocalMode ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              <span>{isLocalMode ? 'Local Mode' : 'Browser Storage'}</span>
            </div>

            {/* Guardar Manual / Respaldar */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-2xl p-1 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleExportJSON}
                title="Exportar base de datos a JSON"
                className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-xl"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportJSON} 
                  className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8" 
                  title="Importar base de datos desde JSON"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-xl"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>

              {isLocalMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={saving}
                  onClick={() => saveWorkspaceData(data)}
                  title="Guardar forzado"
                  className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-slate-200/80 rounded-xl disabled:opacity-35"
                >
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Logout button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-2xl gap-2 font-bold shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Bloquear</span>
            </Button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex bg-white p-1.5 border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ideas', label: 'Ideas & Voz', icon: Lightbulb },
            { id: 'calendar', label: 'Planificador', icon: CalendarIcon },
            { id: 'prompts', label: 'Prompts IA', icon: FileCode },
            { id: 'asistente', label: 'Asistente Claude', icon: Share2 },
            { id: 'copilot', label: 'Copiloto local', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-sm scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Contents */}
        <div className="flex-1 min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:col-span-3 gap-4">
                  {[
                    { label: 'Ideas totales', val: totalIdeasCount, desc: 'Guardadas en disco', color: 'text-emerald-600' },
                    { label: 'Ideas sin usar', val: unusedIdeasCount, desc: 'Pendientes de guión', color: 'text-sky-600' },
                    { label: 'Prompts IA', val: totalPromptsCount, desc: 'En biblioteca', color: 'text-violet-600' },
                    { label: 'Tareas esta semana', val: `${completedThisWeekCount}/${thisWeekBlocks.length}`, desc: `Semana ${weekId}`, color: 'text-amber-600' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                      <h3 className={`text-3xl font-black mt-2 ${stat.color}`}>{stat.val}</h3>
                      <p className="text-slate-600 text-[11px] font-medium mt-1">{stat.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Left col: Today's agenda & Quick Input */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Today's scheduler list */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                      <CalendarIcon className="w-5 h-5 text-emerald-400" />
                      <span>Agenda de Trabajo - Hoy</span>
                    </h2>
                    
                    {thisWeekBlocks.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                        <CalendarIcon className="w-12 h-12 text-slate-400 mb-3" />
                        <h4 className="font-bold text-slate-600">Sin bloques programados</h4>
                        <p className="text-slate-400 text-xs max-w-[280px] mt-1">Programa tus bloques semanales para no olvidar nada.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {thisWeekBlocks.map(block => (
                          <div 
                            key={block.id}
                            onClick={() => handleToggleBlockStatus(block.id)}
                            className={`p-4 rounded-2xl border bg-white hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer border-slate-200 ${
                              block.status === 'completado' ? 'opacity-40 line-through' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className={`w-3 h-3 rounded-full ${
                                block.status === 'completado' 
                                  ? 'bg-emerald-500' 
                                  : block.status === 'en-progreso' 
                                    ? 'bg-amber-500 animate-pulse' 
                                    : 'bg-slate-300'
                              }`} />
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm leading-snug">{block.title}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                                    {block.day}
                                  </span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                                    ⏰ {block.time}
                                  </span>
                                  <span className={`text-[10px] border px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide ${getCategoryStyles(block.category)}`}>
                                    {block.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${getTypeStyles(block.type)}`}>
                              {block.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Idea Input */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-sky-600" />
                      <span>Anotar Idea Rápida</span>
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Escribe algo rápido que se te ocurra y pulsa Enter..."
                        value={quickIdeaText}
                        onChange={e => setQuickIdeaText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddQuickIdea(); }}
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 outline-none text-xs text-slate-800 transition-colors"
                      />
                      <Button onClick={handleAddQuickIdea} className="bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold px-6 rounded-xl text-xs gap-1">
                        <span>Añadir</span>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right col: Recent Ideas */}
                <div className="flex flex-col gap-6">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <Lightbulb className="w-5 h-5 text-violet-600" />
                        <span>Ideas Recientes</span>
                      </h2>
                      <button onClick={() => setActiveTab('ideas')} className="text-[11px] font-bold text-emerald-600 hover:underline">Ver todas →</button>
                    </div>
                    
                    {data.ideas?.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                        <Lightbulb className="w-10 h-10 text-slate-400 mb-2" />
                        <h4 className="font-bold text-slate-600 text-xs">Sin ideas guardadas</h4>
                        <p className="text-slate-400 text-[10px] max-w-[200px] mt-0.5">Captura tus ideas visuales o de audio en la pestaña de Ideas.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto pr-2 max-h-[400px]">
                        {data.ideas.slice(0, 5).map(idea => (
                          <div key={idea.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col gap-2 relative overflow-hidden group shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-xs text-slate-700 leading-tight line-clamp-1 group-hover:text-emerald-700 transition-colors">{idea.title}</h4>
                              <span className={`text-[8px] uppercase tracking-wide border px-1.5 py-0.5 rounded-full font-bold ${getCategoryStyles(idea.category)}`}>
                                {idea.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{idea.description || 'Sin descripción.'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {idea.usada ? (
                                <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">✓ Usada</span>
                              ) : (
                                <span className="text-[9px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold">Pendiente</span>
                              )}
                              <span className="text-[9px] text-slate-500 font-bold">{getFormatLabel(idea.format)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. IDEAS Y NOTAS DE VOZ */}
            {activeTab === 'ideas' && (
              <motion.div
                key="ideas"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Formulario de Nueva Idea (Left panel) */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5 self-start">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                      <Plus className="w-5 h-5 text-emerald-600" />
                      <span>Capturar Idea</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Registra tus pensamientos escribiendo o dictando por voz.</p>
                  </div>

                  {/* Título */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Título de la Idea</label>
                    <input 
                      type="text"
                      placeholder="Ej: Meditación exprés para combatir estrés..."
                      value={newIdeaTitle}
                      onChange={e => setNewIdeaTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-800 transition-colors"
                    />
                  </div>

                  {/* Configuración */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Categoría</label>
                      <select
                        value={newIdeaCategory}
                        onChange={e => setNewIdeaCategory(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-xs text-slate-700 font-bold"
                      >
                        <option value="mente">🧠 Mente</option>
                        <option value="cuerpo">🌿 Cuerpo</option>
                        <option value="finanzas">💰 Finanzas</option>
                        <option value="general">💼 General</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Formato</label>
                      <select
                        value={newIdeaFormat}
                        onChange={e => setNewIdeaFormat(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-xs text-slate-700 font-bold"
                      >
                        <option value="short">🎥 Short/Reel</option>
                        <option value="video-largo">📺 Vídeo Largo</option>
                        <option value="post">✍️ Post Social</option>
                      </select>
                    </div>
                  </div>

                  {/* Grabadora de Voz local */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Audio o Dictador</span>
                    
                    <div className="flex items-center gap-3">
                      {!isRecording ? (
                        <Button 
                          type="button"
                          onClick={startRecording}
                          className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl w-full gap-2 font-bold py-5"
                        >
                          <Mic className="w-4 h-4 animate-pulse text-red-500" />
                          <span>Grabar nota de voz</span>
                        </Button>
                      ) : (
                        <Button 
                          type="button"
                          onClick={stopRecording}
                          className="bg-slate-800 border border-red-500 text-red-400 hover:bg-slate-700 rounded-xl w-full gap-2 font-bold py-5 animate-pulse"
                        >
                          <Square className="w-4 h-4 fill-current text-red-500" />
                          <span>Detener Grabación</span>
                        </Button>
                      )}
                    </div>

                    {isRecording && (
                      <div className="flex justify-center items-center gap-1.5 py-2 bg-red-50 border border-red-200 rounded-xl">
                        {[...Array(5)].map((_, idx) => (
                          <motion.div 
                            key={idx}
                            animate={{ height: [8, 20, 8] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: idx * 0.1 }}
                            className="w-1 bg-red-500 rounded-full"
                          />
                        ))}
                      </div>
                    )}

                    {audioBlob && (
                      <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1">
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-[10px] text-slate-600 font-bold">Audio</span>
                        </div>
                        <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 max-w-[140px] text-xs" />
                      </div>
                    )}
                  </div>

                  {/* Descripción / Texto de dictado */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span>Descripción / Ideas clave</span>
                      {isTranscribing && <span className="text-[10px] text-emerald-600 animate-pulse">Escribiendo...</span>}
                    </label>
                    <textarea 
                      placeholder="Escribe detalles del contenido o habla para transcribir automáticamente..."
                      value={newIdeaDesc}
                      onChange={e => setNewIdeaDesc(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none text-xs text-slate-700 leading-relaxed transition-colors resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleAddIdea}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:opacity-90 font-extrabold py-6 rounded-xl gap-2 active:scale-98 transition-transform"
                  >
                    <span>Guardar Idea</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Listado de Ideas (Right panel) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Buscador y Filtros */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        placeholder="Buscar ideas..."
                        value={searchIdea}
                        onChange={e => setSearchIdea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none text-xs text-slate-700"
                      />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                      <select 
                        value={filterCategory} 
                        onChange={e => setFilterCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700"
                      >
                        <option value="all">Todas las Categorías</option>
                        <option value="mente">🧠 Mente</option>
                        <option value="cuerpo">🌿 Cuerpo</option>
                        <option value="finanzas">💰 Finanzas</option>
                        <option value="general">💼 General</option>
                      </select>

                      <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700"
                      >
                        <option value="all">Ver Todas</option>
                        <option value="pendientes">Pendientes (Sin usar)</option>
                        <option value="usadas">Completadas (Usadas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid de Tarjetas de Ideas */}
                  {filteredIdeas.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-dashed border-slate-300 rounded-3xl bg-slate-50">
                      <Lightbulb className="w-16 h-16 text-slate-400 mb-4" />
                      <h3 className="text-lg font-bold text-slate-600">No se encontraron ideas</h3>
                      <p className="text-slate-400 text-xs mt-1">Ajusta los filtros o añade tu primera idea en el panel lateral.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredIdeas.map(idea => (
                        <div 
                          key={idea.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all group"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-[9px] uppercase tracking-wider font-extrabold border px-2 py-0.5 rounded-full ${getCategoryStyles(idea.category)}`}>
                                {idea.category}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {getFormatLabel(idea.format)}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-emerald-700 transition-colors">
                              {idea.title}
                            </h3>

                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                              {idea.description || 'Sin descripción.'}
                            </p>

                            {/* Si tiene nota de voz grabada */}
                            {idea.audioBase64 && (
                              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between gap-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[9px] text-slate-500 font-bold">Nota de Voz</span>
                                </div>
                                <audio src={idea.audioBase64} controls className="h-6 max-w-[120px] text-[10px]" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3.5">
                            <button
                              onClick={() => handleToggleIdeaUsage(idea.id)}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                                idea.usada 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{idea.usada ? '✓ Usada' : 'Marcar como usada'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteIdea(idea.id)}
                              className="text-slate-600 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-all"
                              title="Eliminar idea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. PLANIFICADOR DE BLOQUES SEMANALES */}
            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                {/* Selector Semanal */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl gap-2 font-bold px-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Semana Anterior</span>
                  </Button>

                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-600">Cuadrante Quioba Studios</span>
                    <h3 className="font-extrabold text-sm md:text-base text-slate-800 mt-0.5">
                      Semana del {weekDays[0].getDate()} de {months[weekDays[0].getMonth()]} al {weekDays[6].getDate()} de {months[weekDays[6].getMonth()]} ({weekDays[6].getFullYear()})
                    </h3>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl gap-2 font-bold px-4"
                  >
                    <span>Siguiente Semana</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Planificación Visual Semanal */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekDays.map((dayDate, i) => {
                    const dateStr = dayDate.toISOString().split('T')[0];
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const dayBlocks = data.blocks?.filter(b => b.fecha === dateStr) || [];
                    
                    return (
                      <div 
                        key={i} 
                        className={`bg-white border rounded-2xl flex flex-col min-h-[300px] border-slate-200 shadow-sm ${
                          isToday ? 'border-t-2 border-t-emerald-500' : ''
                        }`}
                      >
                        {/* Cabecera del día */}
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{dayNames[i]}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold">{dayDate.getDate()} {months[dayDate.getMonth()]}</span>
                          </div>
                          {isToday && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                              HOY
                            </span>
                          )}
                        </div>

                        {/* Contenido / Bloques de ese día */}
                        <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[350px]">
                          {dayBlocks.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-4">
                              <span className="text-[10px] text-slate-600 text-center italic">Sin bloques</span>
                            </div>
                          ) : (
                            dayBlocks.map(block => (
                              <div 
                                key={block.id}
                                className={`p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1.5 hover:border-emerald-300 transition-colors relative group ${
                                  block.status === 'completado' ? 'opacity-40 line-through' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-[9px] text-slate-500 font-bold leading-none">{block.time}</span>
                                  <button
                                    onClick={() => handleDeleteBlock(block.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <h4 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2">
                                  {block.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded border uppercase ${getCategoryStyles(block.category)}`}>
                                    {block.category}
                                  </span>
                                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${getTypeStyles(block.type)}`}>
                                    {block.type}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleToggleBlockStatus(block.id)}
                                  className={`text-[8px] font-black uppercase tracking-wider py-0.5 rounded w-full border mt-1 ${
                                    block.status === 'completado'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : block.status === 'en-progreso'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {block.status === 'completado' ? 'Hecho' : block.status === 'en-progreso' ? 'Proceso' : 'Hacer'}
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Botón de añadir bloque al final del día */}
                        <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                          <button
                            onClick={() => openModalTareaDia(dateStr)}
                            className="w-full py-1.5 border border-dashed border-slate-300 hover:border-emerald-400 text-[10px] text-slate-500 hover:text-emerald-600 font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir bloque</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* MODAL PARA AGREGAR NUEVO BLOQUE */}
                {showAddBlockModal && (
                  <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Añadir bloque de trabajo</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Programar para {newBlockDay} - {selectedDateForNewBlock}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Actividad</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Escribir guión sobre fatiga..."
                            value={newBlockTitle}
                            onChange={e => setNewBlockTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 outline-none text-xs text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horario</label>
                            <input 
                              type="text" 
                              placeholder="Ej: 10:00 - 11:30"
                              value={newBlockTime}
                              onChange={e => setNewBlockTime(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 outline-none text-xs text-slate-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enfoque</label>
                            <select
                              value={newBlockCategory}
                              onChange={e => setNewBlockCategory(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none text-xs text-slate-700 font-bold"
                            >
                              <option value="general">💼 General</option>
                              <option value="mente">🧠 Mente</option>
                              <option value="cuerpo">🌿 Cuerpo</option>
                              <option value="finanzas">💰 Finanzas</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Actividad</label>
                          <select
                            value={newBlockType}
                            onChange={e => setNewBlockType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none text-xs text-slate-700 font-bold"
                          >
                            <option value="planificacion">🗓️ Planificación</option>
                            <option value="escritura">✍️ Escritura</option>
                            <option value="grabacion">🎥 Grabación</option>
                            <option value="edicion">✂️ Edición</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3">
                        <Button variant="ghost" onClick={() => setShowAddBlockModal(false)} className="rounded-xl text-slate-400 text-xs">
                          Cancelar
                        </Button>
                        <Button onClick={handleAddBlock} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs px-5">
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. BIBLIOTECA DE PROMPTS */}
            {activeTab === 'prompts' && (
              <motion.div
                key="prompts"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Formulario de Nuevo Prompt (Left Panel) */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5 self-start">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Plus className="w-5 h-5 text-emerald-600" />
                      <span>Crear Prompt</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Crea plantillas personalizadas para estructurar tus scripts en IAs.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Título del Prompt</label>
                    <input 
                      type="text"
                      placeholder="Ej: Script viral de 60 segundos..."
                      value={newPromptTitle}
                      onChange={e => setNewPromptTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Categoría</label>
                      <select
                        value={newPromptCategory}
                        onChange={e => setNewPromptCategory(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 outline-none text-xs text-slate-700 font-bold"
                      >
                        <option value="mente">🧠 Mente</option>
                        <option value="cuerpo">🌿 Cuerpo</option>
                        <option value="finanzas">💰 Finanzas</option>
                        <option value="general">💼 General</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tipo</label>
                      <select
                        value={newPromptTipo}
                        onChange={e => setNewPromptTipo(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 outline-none text-xs text-slate-700 font-bold"
                      >
                        <option value="video">🎥 Video</option>
                        <option value="articulo">📄 Artículo</option>
                        <option value="guion">✍️ Guión</option>
                        <option value="redes">📱 Redes</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Instrucciones del Prompt</label>
                    <textarea 
                      placeholder="Copia las instrucciones detalladas. Tip: Usa [TEMA] o [IDEA] entre corchetes para rellenar después..."
                      value={newPromptContent}
                      onChange={e => setNewPromptContent(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none text-xs text-slate-700 leading-relaxed resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleAddPrompt}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 font-extrabold py-5 rounded-xl gap-2 active:scale-98 transition-transform"
                  >
                    <span>Añadir Prompt</span>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Galería de Prompts (Right Panel) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Buscador y Filtros */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Biblioteca de Prompts</span>
                    
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                      <select 
                        value={filterPromptCategory} 
                        onChange={e => setFilterPromptCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700"
                      >
                        <option value="all">Todas las Categorías</option>
                        <option value="mente">🧠 Mente</option>
                        <option value="cuerpo">🌿 Cuerpo</option>
                        <option value="finanzas">💰 Finanzas</option>
                        <option value="general">💼 General</option>
                      </select>

                      <select 
                        value={filterPromptTipo} 
                        onChange={e => setFilterPromptTipo(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700"
                      >
                        <option value="all">Todos los Tipos</option>
                        <option value="video">🎥 Video</option>
                        <option value="articulo">📄 Artículo</option>
                        <option value="guion">✍️ Guión</option>
                        <option value="redes">📱 Redes</option>
                      </select>
                    </div>
                  </div>

                  {filteredPrompts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-dashed border-slate-300 rounded-3xl bg-slate-50">
                      <FileCode className="w-16 h-16 text-slate-400 mb-4" />
                      <h3 className="text-lg font-bold text-slate-600">No se encontraron prompts</h3>
                      <p className="text-slate-400 text-xs mt-1">Crea tus plantillas en el panel lateral.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPrompts.map(prompt => (
                        <div 
                          key={prompt.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all"
                        >
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-center">
                              <span className={`text-[9px] uppercase tracking-wider font-extrabold border px-2 py-0.5 rounded-full ${getCategoryStyles(prompt.category)}`}>
                                {prompt.category}
                              </span>
                              <div className="flex gap-1">
                                <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full uppercase">{prompt.tipo}</span>
                                {prompt.isCustom ? (
                                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Personalizado</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Sistema</span>
                                )}
                              </div>
                            </div>

                            <h3 className="font-extrabold text-slate-800 text-sm">{prompt.title}</h3>
                            
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 max-h-[140px] overflow-y-auto">
                              <p className="text-[11px] text-slate-600 leading-relaxed font-mono whitespace-pre-wrap select-all">
                                {prompt.content}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3.5">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => copyPromptToClipboard(prompt)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 gap-1.5 h-9"
                              >
                                {copiedPromptId === prompt.id ? (
                                  <>
                                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenPromptInClaude(prompt)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 gap-1.5 h-9"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Claude ↗</span>
                              </Button>
                            </div>

                            {prompt.isCustom && (
                              <button
                                onClick={() => handleDeletePrompt(prompt.id)}
                                className="text-slate-600 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. CLAUDE ASISTENTE E INTEGRACIÓN WEB */}
            {activeTab === 'asistente' && (
              <motion.div
                key="asistente"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-emerald-100 to-violet-100 border border-slate-200 rounded-2xl text-emerald-600">
                      <Share2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-800">Exportar Contexto a Claude.ai</h2>
                      <p className="text-slate-500 text-xs mt-0.5">Sincroniza y planifica usando Claude sin costes de API</p>
                    </div>
                  </div>

                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3.5 py-1.5 rounded-xl">
                    Compatible con Móvil, Tablet y PC
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Context Compiler */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>Resumen de Contexto (Autogenerado)</span>
                      </h3>
                      
                      <Button
                        size="sm"
                        onClick={copyContextToClipboard}
                        className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg h-8 gap-1.5"
                      >
                        {copiedContext ? (
                          <>
                            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar contexto</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-h-[360px] overflow-y-auto">
                      <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                        {generateClaudeContextSummary()}
                      </pre>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                      Este recuadro se actualiza automáticamente con tus ideas sin usar y tareas planificadas. Puedes copiarlo y pegarlo en cualquier ventana de chat de IA para que conozca tu plan.
                    </p>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>¿Qué quieres pedirle a Claude?</span>
                      </h3>
                      <p className="text-slate-500 text-xs">Selecciona una tarea de producción pre-diseñada:</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <select
                          value={claudeTask}
                          onChange={e => setClaudeTask(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-xs text-slate-700 font-bold transition-all"
                        >
                          <option value="planificar">🗓️ Planificar mi semana de contenido</option>
                          <option value="ideas">💡 Desarrollar mis ideas sin usar</option>
                          <option value="prompt">🎥 Crear un prompt detallado para video</option>
                          <option value="guion">✍️ Escribir un guión para Short/Reel</option>
                          <option value="titulo">🔥 Generar 10 títulos virales y llamativos</option>
                          <option value="custom">⚙️ Tarea personalizada...</option>
                        </select>
                      </div>

                      {claudeTask === 'custom' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Describe tu tarea</label>
                          <textarea
                            placeholder="Ej: Escribe un post educativo para Instagram comparando Cuerpo y Mente en base a mis ideas..."
                            value={claudeCustomText}
                            onChange={e => setClaudeCustomText(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 outline-none text-xs text-slate-700 resize-none"
                          />
                        </motion.div>
                      )}

                      <Button
                        onClick={handleOpenInClaude}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 font-extrabold py-6 rounded-xl gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.15)] transition-all"
                      >
                        <span>Abrir en Claude.ai ↗</span>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                      <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5 mb-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>¿Cómo funciona esto en Móvil o Tablet?</span>
                      </h4>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        Al pulsar "Abrir en Claude.ai", se abrirá una nueva pestaña en tu navegador web o la app de Claude. Toda tu información (ideas recientes y tareas) se empaquetará dentro del prompt inicial. No necesitas escribir nada a mano, ¡solo pulsar Enviar en Claude!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. COPILOTO LOCAL (ANTIGRAVITY) */}
            {activeTab === 'copilot' && (
              <motion.div
                key="copilot"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-emerald-100 to-violet-100 border border-slate-200 rounded-2xl text-emerald-600">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-800">Sincronización con Antigravity (Copiloto Local)</h2>
                      <p className="text-slate-500 text-xs mt-0.5">Colabora directamente conmigo en tu PC de desarrollo</p>
                    </div>
                  </div>

                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3.5 py-1.5 rounded-xl">
                    Sincronización Directa de Archivos
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Direct File Connection */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>¿Cómo funciona esta sincronización?</span>
                    </h3>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Al estar utilizando Quioba de forma local en tu ordenador, todos tus datos se almacenan en el archivo físico <code className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-emerald-700">content/workspace/workspace-data.json</code>.
                    </p>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Como soy tu copiloto de IA con acceso a tus archivos de desarrollo, **puedo leer y escribir directamente en ese archivo**. Esto te permite darme tareas directamente en este chat y ver el resultado en pantalla en tu navegador en tiempo real.
                    </p>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-amber-900">Flujo paso a paso:</h4>
                      <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside">
                        <li>Captura una idea en la pestaña **Ideas & Voz**.</li>
                        <li>Pídeme ayuda en este chat de pair programming (ej: *"Antigravity, redacta un guion para mi idea"*).</li>
                        <li>Yo procesaré tu idea y escribiré el guion directamente en tu archivo JSON local.</li>
                        <li>**Refresca el navegador** en tu PC y ve a la sección de Prompts. ¡Verás el guion redactado!</li>
                      </ol>
                    </div>
                  </div>

                  {/* Right Column: Suggested Chat Commands */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                        <Copy className="w-5 h-5 text-violet-600" />
                        <span>Instrucciones recomendadas para mí</span>
                      </h3>
                      <p className="text-slate-500 text-xs">Copia cualquiera de estas órdenes y pégalas directamente en nuestro chat:</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          title: '💡 Redacción de Guión Técnico',
                          instruct: 'Oye Antigravity, revisa mi última idea guardada en Quioba Studios y redacta un guión de Short de 60 segundos con retención alta. Guárdalo como prompt en mi biblioteca.'
                        },
                        {
                          title: '📅 Planificación por Bloques',
                          instruct: 'Por favor, añade 3 bloques de tareas para este jueves en mi planificador semanal dedicados a la escritura y grabación de contenidos de Finanzas Familiares.'
                        },
                        {
                          title: '🔥 Depurar y Crear Ideas',
                          instruct: 'Revisa mi base de datos de ideas en Quioba Studios. Si hay alguna repetida marca una como usada y consolídala. Luego, añade 2 ideas frescas de Mente y guárdalas directamente.'
                        }
                      ].map((instr, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                          <h4 className="font-bold text-xs text-slate-800">{instr.title}</h4>
                          <p className="text-xs text-slate-600 italic leading-relaxed bg-slate-50 p-3 rounded-xl font-mono">
                            "{instr.instruct}"
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(instr.instruct);
                              toast.success('¡Instrucción copiada! Pégala en el chat.');
                            }}
                            className="bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold w-fit gap-2 h-8"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar sugerencia</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
