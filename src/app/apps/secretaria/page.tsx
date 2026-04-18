'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings, Zap, BookOpen, ArrowRight, CheckCircle2,
  Moon, Sun, Clock, X, CalendarDays, Calendar, Archive, BarChart3
} from 'lucide-react';
import {
  getSecretarySettings, getAvatarById, getUserFirstName,
  PERSONALITY_TEXTS, type SecretarySettings
} from '@/lib/secretary-settings';

// ─── Secretaria — Home / Entrada ─────────────────────────────────────────────

export default function SecretariaPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SecretarySettings | null>(null);
  const [user, setUser] = useState<any>(null);
  const [todaySync, setTodaySync] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSecretarySettings();
    setSettings(s);
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('secretary_syncs')
        .select('completed_at, briefing_read_at, mode, victories, planned_expenses')
        .eq('user_id', u.id)
        .eq('sync_date', today)
        .maybeSingle();

      setTodaySync(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900">
        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  const profile     = getAvatarById(settings.avatarId);
  const texts       = PERSONALITY_TEXTS[settings.personality];
  const firstName   = getUserFirstName(user);
  const now         = new Date();
  const hour        = now.getHours();
  const isMorning   = hour >= 5 && hour < 13;
  const isNight     = hour >= 20 || hour < 5;

  const syncDone     = !!todaySync?.completed_at;
  const briefingRead = !!todaySync?.briefing_read_at;

  const statusMessage = !syncDone
    ? { emoji: '🌙', label: 'Sync pendiente', sub: 'Planifica mañana antes de dormir', accent: 'indigo', href: '/apps/secretaria/sync' }
    : !briefingRead
    ? { emoji: '☀️', label: 'Briefing disponible', sub: 'Tu resumen del día te espera', accent: 'amber', href: '/apps/secretaria/briefing' }
    : { emoji: '✅', label: 'Todo al día', sub: 'Sync y briefing completados hoy', accent: 'emerald', href: null };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button onClick={() => router.push('/')} className="text-white/40 hover:text-white/70 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="text-white/60 text-sm font-medium">Secretaria</span>
        <button
          onClick={() => router.push('/apps/secretaria/settings')}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Avatar + Greeting */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-5xl shadow-xl border border-white/10">
            {profile.emoji}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">{profile.label}</h1>
            <p className="text-white/50 text-sm mt-1">
              {isMorning
                ? texts.briefingGreeting(firstName)
                : isNight
                ? texts.syncWelcome(firstName)
                : `Hola, ${firstName}. ¿En qué puedo ayudarte?`}
            </p>
          </div>
          <p className="text-white/30 text-xs capitalize">
            {format(now, "EEEE, d 'de' MMMM · HH:mm", { locale: es })}
          </p>
        </div>

        {/* Status card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          statusMessage.accent === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
          statusMessage.accent === 'amber'   ? 'bg-amber-500/10 border-amber-500/20' :
                                               'bg-indigo-500/10 border-indigo-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusMessage.emoji}</span>
            <div className="flex-1">
              <p className={`font-bold text-sm ${
                statusMessage.accent === 'emerald' ? 'text-emerald-300' :
                statusMessage.accent === 'amber'   ? 'text-amber-300' : 'text-indigo-300'
              }`}>{statusMessage.label}</p>
              <p className="text-white/50 text-xs mt-0.5">{statusMessage.sub}</p>
            </div>
            {statusMessage.href && (
              <button
                onClick={() => router.push(statusMessage.href!)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Checklist */}
          <div className="mt-3 pt-3 border-t border-white/10 flex gap-4">
            <div className={`flex items-center gap-1.5 text-xs ${syncDone ? 'text-emerald-300' : 'text-white/30'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sync
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${briefingRead ? 'text-emerald-300' : 'text-white/30'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Briefing
            </div>
            {todaySync?.mode && (
              <Badge className="ml-auto bg-white/10 text-white/50 border-white/10 text-[10px]">
                {todaySync.mode === 'quick' ? '⚡ Rápido' : todaySync.mode === 'conversational' ? '🤖 IA' : '📖 Profundo'}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Acciones</p>
          <ActionCard
            emoji="🌙" label="Sync Nocturno" sub="Planifica y cierra el día"
            href="/apps/secretaria/sync"
            badge={!syncDone ? 'Pendiente' : undefined}
            badgeColor="indigo"
            onClick={() => router.push('/apps/secretaria/sync')}
          />
          <ActionCard
            emoji="☀️" label="Briefing Matutino" sub="Tu resumen del día"
            href="/apps/secretaria/briefing"
            badge={syncDone && !briefingRead ? 'Nuevo' : undefined}
            badgeColor="amber"
            onClick={() => router.push('/apps/secretaria/briefing')}
          />
        </div>

        {/* Sync Semanal y Mensual */}
        <div className="space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Visión amplia</p>
          <ActionCard
            emoji="📅" label="Sync Semanal" sub="Revisa los próximos 7 días"
            href="/apps/secretaria/sync/weekly"
            onClick={() => router.push('/apps/secretaria/sync/weekly')}
          />
          <ActionCard
            emoji="📆" label="Sync Mensual" sub="Resumen y planificación del mes"
            href="/apps/secretaria/sync/monthly"
            onClick={() => router.push('/apps/secretaria/sync/monthly')}
          />
          <ActionCard
            emoji="✨" label="Reunión de Vida" sub="Visión estratégica mensual"
            href="/apps/secretaria/vida"
            badge={undefined}
            onClick={() => router.push('/apps/secretaria/vida')}
          />
        </div>

        {/* Archivo */}
        <button
          onClick={() => router.push('/apps/secretaria/archivo')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          <Archive className="w-5 h-5 text-white/40" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium">Archivo de Syncs</p>
            <p className="text-white/40 text-xs">Historial de todos tus syncs</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30" />
        </button>

        {/* Today summary (if sync done) */}
        {todaySync?.victories && todaySync.victories.length > 0 && (
          <div className="space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-widest">Tus victorias de hoy</p>
            <div className="space-y-2">
              {todaySync.victories.slice(0, 3).map((v: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-yellow-400">🏆</span>
                  <span className="text-sm text-yellow-200">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings shortcut */}
        <button
          onClick={() => router.push('/apps/secretaria/settings')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          <Settings className="w-5 h-5 text-white/40" />
          <div className="text-left">
            <p className="text-sm font-medium">Configurar secretaria</p>
            <p className="text-white/40 text-xs">{profile.label} · {settings.personality}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
        </button>

      </div>
    </div>
  );
}

function ActionCard({ emoji, label, sub, onClick, badge, badgeColor }: {
  emoji: string; label: string; sub: string; href: string;
  onClick: () => void; badge?: string; badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
    >
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{label}</p>
          {badge && (
            <Badge className={`text-[10px] ${
              badgeColor === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
              badgeColor === 'amber'  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                        'bg-white/10 text-white/50 border-white/10'
            }`}>{badge}</Badge>
          )}
        </div>
        <p className="text-white/40 text-xs mt-0.5">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/30" />
    </button>
  );
}
