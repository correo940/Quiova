'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3, Users, Eye, Globe, Smartphone, Monitor, Laptop, RefreshCw, Clock } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

interface AnalyticsData {
  totalViews: number;
  uniqueSessions: number;
  topPages: { path: string; views: number }[];
  dailyViews: { day: string; views: number; unique_visitors: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  countryBreakdown: { country: string; count: number }[];
  referrerBreakdown: { referrer: string; count: number }[];
  recentViews: { path: string; device: string; browser: string; country: string; city: string; referrer: string; created_at: string }[];
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="w-4 h-4" />,
  desktop: <Monitor className="w-4 h-4" />,
  tablet: <Laptop className="w-4 h-4" />,
};

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', US: '🇺🇸', MX: '🇲🇽', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱',
  PE: '🇵🇪', FR: '🇫🇷', DE: '🇩🇪', GB: '🇬🇧', IT: '🇮🇹', BR: '🇧🇷',
  PT: '🇵🇹', EC: '🇪🇨', VE: '🇻🇪', UY: '🇺🇾', BO: '🇧🇴', PY: '🇵🇾',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function AnalisisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/analytics/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Unauthorized');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    fetchData();
  }, [isAdmin, days]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-800">Acceso Restringido</h2>
          <p className="text-sm text-slate-500 mt-1">Solo el administrador puede ver las estadísticas.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const maxDailyViews = Math.max(...(data?.dailyViews?.map(d => d.views) || [1]));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Análisis de Tráfico
              </h1>
              <p className="text-xs text-slate-500">quioba.com</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300"
            >
              <option value={1}>Hoy</option>
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Visitas</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{data?.totalViews ?? 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Visitantes</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{data?.uniqueSessions ?? 0}</p>
          </div>
        </div>

        {/* Daily Chart */}
        {data?.dailyViews && data.dailyViews.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Visitas por día</h2>
            <div className="flex items-end gap-1 h-32">
              {data.dailyViews.map((d, i) => {
                const h = Math.max((d.views / maxDailyViews) * 100, 4);
                const dayLabel = new Date(d.day).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 transition-opacity">
                      {d.views} visitas · {d.unique_visitors} únicos
                    </div>
                    <div
                      className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 min-w-[8px]"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Pages */}
        {data?.topPages && data.topPages.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Páginas más visitadas</h2>
            <div className="space-y-2">
              {data.topPages.map((p, i) => {
                const pct = (p.views / data.topPages[0].views) * 100;
                return (
                  <div key={i} className="relative">
                    <div className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-lg" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{p.path}</span>
                      <span className="text-xs font-bold text-blue-600">{p.views}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Devices */}
          {data?.deviceBreakdown && data.deviceBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" /> Dispositivos
              </h2>
              <div className="space-y-2">
                {data.deviceBreakdown.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                      {DEVICE_ICONS[d.device] || <Monitor className="w-4 h-4" />}
                      {d.device}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browsers */}
          {data?.browserBreakdown && data.browserBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Navegadores</h2>
              <div className="space-y-2">
                {data.browserBreakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{b.browser}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countries */}
          {data?.countryBreakdown && data.countryBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" /> Países
              </h2>
              <div className="space-y-2">
                {data.countryBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {COUNTRY_FLAGS[c.country] || '🌍'} {c.country}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referrers */}
          {data?.referrerBreakdown && data.referrerBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Origen del tráfico</h2>
              <div className="space-y-2">
                {data.referrerBreakdown.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[70%]">{r.referrer}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {data?.recentViews && data.recentViews.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Actividad reciente
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentViews.map((v, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex-shrink-0 text-slate-400">
                    {DEVICE_ICONS[v.device] || <Monitor className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{v.path}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {v.browser} · {COUNTRY_FLAGS[v.country] || ''} {v.country || 'Desconocido'}
                      {v.city ? ` · ${v.city}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{timeAgo(v.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && (data.totalViews === 0 || data.totalViews === null) && (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-white">Sin datos todavía</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Las visitas a quioba.com se empezarán a registrar a partir de ahora.
              Vuelve pronto para ver las estadísticas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
