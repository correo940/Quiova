'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false, loading: () => <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '12px' }}>Cargando mapa...</div> });

// Static configuration & assets
const COLORES = ['#1a5c2e', '#3B6D11', '#b87514', '#F5C400', '#1558a8', '#0f6e56', '#4a8a16', '#298A46'];
const CAT_COLORS = { comida: '#b87514', transporte: '#1558a8', alojamiento: '#3B6D11', ocio: '#F5C400', otros: '#1a5c2e' };
const UBICACIONES = {
  madrid: { nombre: 'Madrid', lat: 40.4168, lng: -3.7038 },
  barcelona: { nombre: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  valencia: { nombre: 'Valencia', lat: 39.4699, lng: -0.3763 },
  lisboa: { nombre: 'Lisboa', lat: 38.7223, lng: -9.1393 },
  oporto: { nombre: 'Oporto', lat: 41.1579, lng: -8.6291 },
  sintra: { nombre: 'Sintra', lat: 38.8018, lng: -9.3938 },
  belem: { nombre: 'Belém', lat: 38.6617, lng: -9.2057 },
  cascais: { nombre: 'Cascais', lat: 38.6820, lng: -9.4213 },
  paris: { nombre: 'París', lat: 48.8566, lng: 2.3522 },
  roma: { nombre: 'Roma', lat: 41.9028, lng: 12.4964 },
  london: { nombre: 'Londres', lat: 51.5074, lng: -0.1278 },
  berlin: { nombre: 'Berlín', lat: 52.5200, lng: 13.4050 },
  amsterdam: { nombre: 'Ámsterdam', lat: 52.3676, lng: 4.9041 },
  vegas: { nombre: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  nyc: { nombre: 'Nueva York', lat: 40.7128, lng: -74.0060 },
  losangeles: { nombre: 'Los Ángeles', lat: 34.0522, lng: -118.2437 },
};
const DIVISAS = { EUR: { s: '€', r: 1 }, USD: { s: '$', r: 1.08 }, GBP: { s: '£', r: 0.86 }, JPY: { s: '¥', r: 163 }, MXN: { s: 'M$', r: 18.5 } };
const EMOJIS = ['👍', '❤️', '🔥', '😂', '🙌', '😍', '🎉', '💯', '✨', '🚀'];
const QUICK_REPLIES = ['👍 Ok, lo apunto!', '💸 Yo puedo pagar', '⏰ ¿Cuándo saldamos?', '✅ Ya he pagado'];
const CAT_ICONS = { comida: '🍽', transporte: '🚕', alojamiento: '🏨', ocio: '🎉', otros: '📌' };

export default function SplitSmartExpensesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGTab, setActiveGTab] = useState('gastos');
  const [activeRecTab, setActiveRecTab] = useState('lista');
  const [activeInvTab, setActiveInvTab] = useState('enlace');

  // Global State (Now backed by Supabase)
  const [S, setS] = useState({
    grupoIdx: 0,
    divisaBase: 'EUR',
    mostrarRuta: false,
    calFecha: new Date(),
    grupos: [] as any[]
  });
  
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [agendaEvents, setAgendaEvents] = useState<any[]>([]);

  // Fetch user on mount
  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }
    getUser();
  }, []);

  // Fetch daily notifications/events on mount/user change
  useEffect(() => {
    if (!userId) return;
    async function loadAgendaEvents() {
      try {
        const todayDate = new Date();
        const startOfDay = new Date(todayDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(todayDate); endOfDay.setHours(23, 59, 59, 999);
        const dateStr = startOfDay.toISOString().split('T')[0];

        const dailyEvents: any[] = [];

        // 1. Shifts
        const { data: shifts } = await supabase
          .from('work_shifts')
          .select('title, start_time')
          .eq('user_id', userId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString());
        shifts?.forEach(s => dailyEvents.push({
          label: s.title,
          sub: `${new Date(s.start_time).getHours()}:${new Date(s.start_time).getMinutes().toString().padStart(2, '0')}`,
          color: '#475569', // slate-600
          icon: '💼',
        }));

        // 2. Vehicles (ITV, Seguro)
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('name, brand, next_itv_date, insurance_expiry_date')
          .eq('user_id', userId);
        vehicles?.forEach(v => {
          if (v.next_itv_date?.startsWith(dateStr)) dailyEvents.push({
            label: `ITV: ${v.brand || v.name}`,
            sub: 'Hoy',
            color: '#ea580c', // orange-600
            icon: '⚠️',
          });
          if (v.insurance_expiry_date?.startsWith(dateStr)) dailyEvents.push({
            label: `Seguro: ${v.brand || v.name}`,
            sub: 'Hoy',
            color: '#2563eb', // blue-600
            icon: '🚗',
          });
        });

        // 3. Insurances
        const { data: insurances } = await supabase
          .from('insurances')
          .select('name, expiration_date')
          .eq('user_id', userId)
          .eq('expiration_date', dateStr);
        insurances?.forEach(i => dailyEvents.push({
          label: `Vence: ${i.name}`,
          sub: 'Hoy',
          color: '#dc2626', // red-600
          icon: '🛡️',
        }));

        // 4. Documents
        const { data: docs } = await supabase
          .from('documents')
          .select('name, expiration_date')
          .eq('user_id', userId)
          .eq('expiration_date', dateStr);
        docs?.forEach(d => dailyEvents.push({
          label: `Caduca: ${d.name}`,
          sub: 'Hoy',
          color: '#dc2626', // red-600
          icon: '📄',
        }));

        // 5. Maintenance reminders
        const in7Days = new Date(todayDate);
        in7Days.setDate(in7Days.getDate() + 7);
        const { data: reminders } = await supabase
          .from('manual_reminders')
          .select('title, next_date, manuals!inner(title)')
          .eq('is_active', true)
          .gte('next_date', startOfDay.toISOString())
          .lte('next_date', in7Days.toISOString())
          .order('next_date');
        reminders?.forEach((r: any) => dailyEvents.push({
          label: r.title,
          sub: r.manuals?.title || '',
          fecha: new Date(r.next_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          color: '#15803d', // green-700
          icon: '🔧',
        }));

        setAgendaEvents(dailyEvents);
      } catch (err) {
        console.error('Error loading agenda events:', err);
      }
    }
    loadAgendaEvents();
  }, [userId]);

  // Fetch groups on mount
  useEffect(() => {
    async function loadGrupos() {
      setIsLoadingGroups(true);
      try {
        const { data: dbGrupos, error } = await supabase.from('splitsmart_grupos').select('*');
        if (error) throw error;
        
        if (dbGrupos && dbGrupos.length > 0) {
          // Fetch members and expenses for each group
          const groupsWithData = await Promise.all(dbGrupos.map(async (g) => {
            const { data: miembros } = await supabase.from('splitsmart_miembros').select('*').eq('grupo_id', g.id);
            const { data: gastos } = await supabase.from('splitsmart_gastos').select('*').eq('grupo_id', g.id);
            
            return {
              id: g.id,
              nombre: g.nombre,
              emoji: g.emoji || '💸',
              miembros: miembros ? miembros.map((m: any) => m.nombre) : ['Tú'],
              miembrosData: miembros || [],
              gastos: gastos ? gastos.map((x: any) => ({
                id: x.id,
                desc: x.descripcion || '',
                monto: Number(x.monto),
                divisa: x.divisa || 'EUR',
                cat: x.categoria || 'otros',
                pagador: miembros ? miembros.findIndex((m: any) => m.id === x.pagador_id) : 0,
                fecha: x.fecha || '',
                ubicacion: x.ubicacion || '',
                reacciones: x.reacciones || {}
              })) : [],
              recurrentes: [],
              chat: [],
              invitaciones: [],
              presupuesto: { maximo: g.presupuesto_maximo || 0, alerta: g.presupuesto_alerta || 75, duracion: 30, fechaInicio: g.created_at },
              cerrado: g.cerrado || false,
              resumen: null
            };
          }));
          
          setS(prev => ({ ...prev, grupos: groupsWithData }));
        } else {
          setS(prev => ({ ...prev, grupos: [] }));
        }
      } catch (err) {
        console.error('Error loading Supabase groups:', err);
      } finally {
        setIsLoadingGroups(false);
      }
    }
    loadGrupos();
  }, []);

  const [yoChat, setYoChat] = useState('Tú');
  const [chatInput, setChatInput] = useState('');
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  // Modales
  const [isNuevoGrupoModalOpen, setIsNuevoGrupoModalOpen] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [nuevoGrupoEmoji, setNuevoGrupoEmoji] = useState('💸');
  const [emojiCatOpen, setEmojiCatOpen] = useState<string | null>(null);

  // Edit group modal
  const [isEditGrupoModalOpen, setIsEditGrupoModalOpen] = useState(false);
  const [editGrupoIdx, setEditGrupoIdx] = useState<number | null>(null);
  const [editGrupoNombre, setEditGrupoNombre] = useState('');
  const [editGrupoEmoji, setEditGrupoEmoji] = useState('💸');
  const [editEmojiCatOpen, setEditEmojiCatOpen] = useState<string | null>(null);

  // Edit expense modal
  const [isEditGastoModalOpen, setIsEditGastoModalOpen] = useState(false);
  const [editGastoId, setEditGastoId] = useState<string | null>(null);
  const [editGastoDesc, setEditGastoDesc] = useState('');
  const [editGastoMonto, setEditGastoMonto] = useState('');
  const [editGastoDivisa, setEditGastoDivisa] = useState('EUR');
  const [editGastoCat, setEditGastoCat] = useState('comida');
  
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isPresModalOpen, setIsPresModalOpen] = useState(false);
  const [isResumenModalOpen, setIsResumenModalOpen] = useState(false);
  const [isResumenLoading, setIsResumenLoading] = useState(false);

  // Forms Fields
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoDivisa, setGastoDivisa] = useState('EUR');
  const [gastoPagador, setGastoPagador] = useState('0');
  const [gastoCat, setGastoCat] = useState('comida');
  const [gastoUbicacion, setGastoUbicacion] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<{nombre: string, lat: number, lng: number, display: string}[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const agendaScrollRef = React.useRef<HTMLDivElement>(null);
  const [gastoDivision, setGastoDivision] = useState('igual');

  const [recDesc, setRecDesc] = useState('');
  const [recMonto, setRecMonto] = useState('');
  const [recPagador, setRecPagador] = useState('0');
  const [recFreq, setRecFreq] = useState('mensual');
  const [recDia, setRecDia] = useState('1');
  const [recCat, setRecCat] = useState('comida');

  const [presMaximo, setPresMaximo] = useState('');
  const [presAlerta, setPresAlerta] = useState('75');
  const [presDuracion, setPresDuracion] = useState('30');

  const [resumenResult, setResumenResult] = useState<any>(null);
  const [filtroCat, setFiltroCat] = useState('');
  const [calFechaActual, setCalFechaActual] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [nuevoMiembroNombre, setNuevoMiembroNombre] = useState('');

  // Active Group Helper
  const grupo = S.grupos[S.grupoIdx];

  // Helpers
  const fmt = (v: number, d = 'EUR') => {
    return (DIVISAS[d as keyof typeof DIVISAS]?.s || '€') + Math.abs(v).toFixed(2);
  };

  const fmtBase = (v: number, d = 'EUR') => {
    return fmt(v / (DIVISAS[d as keyof typeof DIVISAS]?.r || 1) * (DIVISAS[S.divisaBase as keyof typeof DIVISAS]?.r || 1), S.divisaBase);
  };

  const ini = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const avColor = (i: number) => COLORES[i % COLORES.length];
  const avEl = (n: string, i: number) => (
    <span className="avatar" style={{ background: `${avColor(i)}33`, color: avColor(i) }}>
      {ini(n)}
    </span>
  );
  const hoy = () => new Date().toISOString().slice(0, 10);

  // Debts Liquidation Algorithm
  const liquidar = (g: any) => {
    const n = g.miembros.length;
    const pagado = new Array(n).fill(0);
    g.gastos.forEach((x: any) => {
      const base = x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1);
      pagado[x.pagador] += base;
    });
    const total = pagado.reduce((sum: number, xVal: number) => sum + xVal, 0);
    const media = total / n;
    const deuda = pagado.map((p: number) => +(p - media).toFixed(2));
    const transfers = [];
    const d = [...deuda];
    for (let i = 0; i < 50; i++) {
      const maxAcreedor = d.indexOf(Math.max(...d));
      const maxDeudor = d.indexOf(Math.min(...d));
      if (d[maxAcreedor] < 0.01 || d[maxDeudor] > -0.01) break;
      const monto = Math.min(d[maxAcreedor], -d[maxDeudor]);
      transfers.push({ de: maxDeudor, a: maxAcreedor, monto: +monto.toFixed(2) });
      d[maxAcreedor] -= monto;
      d[maxDeudor] += monto;
    }
    return transfers;
  };

  // Global calculations
  let deben = 0, debes = 0, gastado = 0, presTotal = 0;
  const yo = 'Tú';
  S.grupos.forEach((g: any) => {
    const liq = liquidar(g);
    liq.forEach((t: any) => {
      if (g.miembros[t.de] === yo) debes += t.monto;
      if (g.miembros[t.a] === yo) deben += t.monto;
    });
    gastado += g.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
    presTotal += g.presupuesto.maximo;
  });
  const balance = deben - debes;
  const disponible = presTotal - gastado;

  // Alerts
  const alertas: { tipo: string, texto: string, grupo: string }[] = [];
  S.grupos.forEach((g: any) => {
    const gasto = g.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
    const pct = g.presupuesto.maximo > 0 ? (gasto / g.presupuesto.maximo) * 100 : 0;
    if (pct >= 100) {
      alertas.push({ tipo: 'over', texto: `❌ presupuesto excedido (${Math.round(pct)}%)`, grupo: g.nombre });
    } else if (pct >= g.presupuesto.alerta) {
      alertas.push({ tipo: 'warn', texto: `⚠️ ${Math.round(pct)}% del presupuesto usado`, grupo: g.nombre });
    }
  });

  // Action methods
  const pagarLiquidacion = (gId: string, de: number, a: number, monto: number) => {
    const nextGrupos = S.grupos.map(g => {
      if (g.id === gId) {
        return {
          ...g,
          chat: [
            ...g.chat,
            {
              id: 'c' + Date.now(),
              autor: g.miembros[de],
              texto: `✅ He pagado ${fmt(monto)} a ${g.miembros[a]}`,
              tipo: 'sistema',
              fecha: hoy(),
              reacciones: {} as any,
              leido: false
            }
          ]
        };
      }
      return g;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  const registrarPago = (de: number, a: number, monto: number) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        return {
          ...x,
          chat: [
            ...x.chat,
            {
              id: 'c' + Date.now(),
              autor: x.miembros[de],
              texto: `💸 ${x.miembros[de]} pagó ${fmt(monto)} a ${x.miembros[a]}`,
              tipo: 'sistema',
              fecha: hoy(),
              reacciones: {} as any,
              leido: false
            }
          ]
        };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    alert(`✅ Pago registrado: ${grupo.miembros[de]} → ${fmt(monto)} → ${grupo.miembros[a]}`);
  };

  const toggleReaccion = (gastoId: string, emoji: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextGastos = x.gastos.map((g: any) => {
          if (g.id === gastoId) {
            const reacciones = { ...g.reacciones } as any;
            if (!reacciones[emoji]) reacciones[emoji] = [];
            const userIdx = reacciones[emoji].indexOf('Tú');
            if (userIdx >= 0) {
              reacciones[emoji].splice(userIdx, 1);
            } else {
              reacciones[emoji].push('Tú');
            }
            if (reacciones[emoji].length === 0) {
              delete reacciones[emoji];
            }
            return { ...g, reacciones };
          }
          return g;
        });
        return { ...x, gastos: nextGastos };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  const addReaccion = (gastoId: string, emoji: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextGastos = x.gastos.map((g: any) => {
          if (g.id === gastoId) {
            const reacciones = { ...g.reacciones } as any;
            if (!reacciones[emoji]) reacciones[emoji] = [];
            if (!reacciones[emoji].includes('Tú')) reacciones[emoji].push('Tú');
            return { ...g, reacciones };
          }
          return g;
        });
        return { ...x, gastos: nextGastos };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    setOpenPickerId(null);
  };

  const abrirModalGasto = () => {
    setGastoDesc('');
    setGastoMonto('');
    setGastoDivisa('EUR');
    setGastoPagador('0');
    setGastoCat('comida');
    setGastoUbicacion('');
    setGastoDivision('igual');
    setIsGastoModalOpen(true);
  };

  const guardarGasto = async () => {
    const montoNum = parseFloat(gastoMonto);
    if (!gastoDesc.trim() || !montoNum || montoNum <= 0) {
      alert('Rellena descripción y monto');
      return;
    }

    if (!grupo || !grupo.miembrosData || !grupo.miembrosData[parseInt(gastoPagador)]) {
      alert('Error: No se ha podido identificar al pagador.');
      return;
    }

    const member = grupo.miembrosData[parseInt(gastoPagador)];

    try {
      // 1. Insert expense to Supabase
      const { data, error } = await supabase.from('splitsmart_gastos').insert({
        grupo_id: grupo.id,
        pagador_id: member.id,
        descripcion: gastoDesc.trim(),
        monto: montoNum,
        divisa: gastoDivisa,
        categoria: gastoCat,
        fecha: hoy(),
        ubicacion: gastoUbicacion || null
      }).select().single();

      if (error) throw error;

      // 2. Insert automated chat message
      await supabase.from('splitsmart_chat').insert({
        grupo_id: grupo.id,
        autor: 'Sistema',
        texto: `💰 ${member.nombre} añadió "${gastoDesc.trim()}" por ${fmt(montoNum, gastoDivisa)}`
      });

      // 3. Update local state
      const nextGrupos = [...S.grupos];
      nextGrupos[S.grupoIdx].gastos.push({
        id: data.id,
        desc: data.descripcion,
        monto: Number(data.monto),
        divisa: data.divisa,
        cat: data.categoria,
        pagador: parseInt(gastoPagador), // Index mapped to local UI
        fecha: data.fecha,
        ubicacion: data.ubicacion || '',
        reacciones: {}
      });
      setS(prev => ({ ...prev, grupos: nextGrupos }));
      setIsGastoModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Error guardando gasto: ' + err.message);
    }
  };

  const crearGrupo = async () => {
    if (!nuevoGrupoNombre.trim()) return;
    try {
      const { data: gData, error: gError } = await supabase.from('splitsmart_grupos').insert({
        nombre: nuevoGrupoNombre.trim(),
        emoji: nuevoGrupoEmoji || '💸',
        presupuesto_maximo: 0,
        presupuesto_alerta: 75
      }).select().single();
      
      if (gError) throw gError;

      const { data: mData, error: mError } = await supabase.from('splitsmart_miembros').insert({
        grupo_id: gData.id,
        nombre: 'Tú'
      }).select().single();

      if (mError) throw mError;

      const newGroupState = {
        id: gData.id,
        nombre: gData.nombre,
        emoji: gData.emoji,
        miembros: ['Tú'],
        miembrosData: [mData],
        gastos: [],
        recurrentes: [],
        chat: [],
        invitaciones: [],
        presupuesto: { maximo: 0, alerta: 75, duracion: 30, fechaInicio: gData.created_at },
        cerrado: false,
        resumen: null
      };

      setS(prev => ({
        ...prev,
        grupos: [...prev.grupos, newGroupState],
        grupoIdx: prev.grupos.length
      }));
      
      setIsNuevoGrupoModalOpen(false);
      setNuevoGrupoNombre('');
      setNuevoGrupoEmoji('💸');

    } catch (err: any) {
      console.error(err);
      alert('Error creando grupo: ' + err.message);
    }
  };

  const enviarMensaje = () => {
    if (!chatInput.trim()) return;
    const nuevoMsg = {
      id: 'c' + Date.now(),
      autor: yoChat,
      texto: chatInput.trim(),
      tipo: yoChat === 'Tú' ? 'mine' : 'otros',
      fecha: hoy(),
      reacciones: {} as any,
      leido: true
    };
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        return {
          ...x,
          chat: [...x.chat, nuevoMsg]
        };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    setChatInput('');
  };

  const toggleMsgReaccion = (msgId: string, emoji: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextChat = x.chat.map((m: any) => {
          if (m.id === msgId) {
            const reacciones = { ...m.reacciones } as any;
            if (!reacciones[emoji]) reacciones[emoji] = [];
            const uIdx = reacciones[emoji].indexOf(yoChat);
            if (uIdx >= 0) {
              reacciones[emoji].splice(uIdx, 1);
            } else {
              reacciones[emoji].push(yoChat);
            }
            if (reacciones[emoji].length === 0) {
              delete reacciones[emoji];
            }
            return { ...m, reacciones };
          }
          return m;
        });
        return { ...x, chat: nextChat };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  // Chat badging management
  useEffect(() => {
    if (activeTab === 'chat') {
      const nextGrupos = S.grupos.map((x: any, idx: number) => {
        if (idx === S.grupoIdx) {
          const nextChat = x.chat.map((m: any) => ({ ...m, leido: true }));
          return { ...x, chat: nextChat };
        }
        return x;
      });
      setS(prev => ({ ...prev, grupos: nextGrupos }));
    }
  }, [activeTab, S.grupoIdx]);

  const noLeidos = S.grupos[S.grupoIdx]?.chat.filter((m: any) => !m.leido).length || 0;

  // Calendar render helpers
  const renderCalendarioGrid = () => {
    const y = calFechaActual.getFullYear();
    const m = calFechaActual.getMonth();
    const primer = new Date(y, m, 1).getDay() || 7;
    const dias = new Date(y, m + 1, 0).getDate();
    const fechasGasto = new Set(grupo.gastos.map((x: any) => x.fecha));
    const fechasRec = new Set();
    grupo.recurrentes.filter((r: any) => r.activo).forEach((r: any) => {
      for (let d = 1; d <= dias; d++) {
        const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (new Date(r.proximaFecha).getDate() === d) fechasRec.add(f);
      }
    });

    const cells = [];
    const hoyStr = new Date().toISOString().slice(0, 10);

    for (let i = 1; i < primer; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day otro-mes"></div>);
    }

    for (let d = 1; d <= dias; d++) {
      const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tieneGasto = fechasGasto.has(f);
      const tieneRec = fechasRec.has(f);

      cells.push(
        <div
          key={`day-${d}`}
          className={`cal-day ${f === hoyStr ? 'hoy' : ''} ${tieneGasto ? 'tiene-gasto' : ''}`}
          onClick={() => setSelectedCalDate(f)}
        >
          {d}
          {tieneGasto && <div className="cal-dot"></div>}
          {tieneRec && <div className="cal-dot" style={{ background: 'var(--accent)' }}></div>}
        </div>
      );
    }
    return cells;
  };

  const handleCalMes = (delta: number) => {
    const next = new Date(calFechaActual);
    next.setMonth(next.getMonth() + delta);
    setCalFechaActual(next);
  };

  // Recurrente methods
  const toggleRecurrente = (id: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextRecs = x.recurrentes.map((r: any) => r.id === id ? { ...r, activo: !r.activo } : r);
        return { ...x, recurrentes: nextRecs };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  const eliminarRecurrente = (id: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextRecs = x.recurrentes.filter((r: any) => r.id !== id);
        return { ...x, recurrentes: nextRecs };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  const eliminarGasto = async (gastoId: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      const { error } = await supabase.from('splitsmart_gastos').delete().eq('id', gastoId);
      if (error) throw error;
      const nextGrupos = S.grupos.map((x: any, idx: number) => {
        if (idx === S.grupoIdx) {
          return { ...x, gastos: x.gastos.filter((g: any) => g.id !== gastoId) };
        }
        return x;
      });
      setS(prev => ({ ...prev, grupos: nextGrupos }));
    } catch (err: any) {
      console.error(err);
      alert('Error eliminando gasto: ' + err.message);
    }
  };

  const abrirEditGasto = (x: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditGastoId(x.id);
    setEditGastoDesc(x.desc);
    setEditGastoMonto(String(x.monto));
    setEditGastoDivisa(x.divisa || 'EUR');
    setEditGastoCat(x.cat || 'otros');
    setIsEditGastoModalOpen(true);
  };

  const guardarEditGasto = async () => {
    if (!editGastoId || !editGastoDesc.trim() || !editGastoMonto) return;
    const montoNum = parseFloat(editGastoMonto);
    if (isNaN(montoNum) || montoNum <= 0) { alert('Monto inválido'); return; }
    try {
      const { error } = await supabase.from('splitsmart_gastos').update({
        descripcion: editGastoDesc.trim(),
        monto: montoNum,
        divisa: editGastoDivisa,
        categoria: editGastoCat,
      }).eq('id', editGastoId);
      if (error) throw error;
      const nextGrupos = S.grupos.map((grp) => ({
        ...grp,
        gastos: grp.gastos.map((g: any) =>
          g.id === editGastoId
            ? { ...g, desc: editGastoDesc.trim(), monto: montoNum, divisa: editGastoDivisa, cat: editGastoCat }
            : g
        )
      }));
      setS(prev => ({ ...prev, grupos: nextGrupos }));
      setIsEditGastoModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Error actualizando gasto: ' + err.message);
    }
  };

  const abrirEditGrupo = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const g = S.grupos[idx];
    setEditGrupoIdx(idx);
    setEditGrupoNombre(g.nombre);
    setEditGrupoEmoji(g.emoji || '💸');
    setEditEmojiCatOpen(null);
    setIsEditGrupoModalOpen(true);
  };

  const guardarEditGrupo = async () => {
    if (editGrupoIdx === null || !editGrupoNombre.trim()) return;
    const g = S.grupos[editGrupoIdx];
    try {
      const { error } = await supabase.from('splitsmart_grupos').update({
        nombre: editGrupoNombre.trim(),
        emoji: editGrupoEmoji
      }).eq('id', g.id);
      if (error) throw error;
      const nextGrupos = S.grupos.map((x, idx) => {
        if (idx === editGrupoIdx) {
          return { ...x, nombre: editGrupoNombre.trim(), emoji: editGrupoEmoji };
        }
        return x;
      });
      setS(prev => ({ ...prev, grupos: nextGrupos }));
      setIsEditGrupoModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Error actualizando grupo: ' + err.message);
    }
  };

  const eliminarGrupo = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const g = S.grupos[idx];
    if (!confirm(`¿Eliminar el grupo "${g.nombre}" y todos sus gastos? Esta acción no se puede deshacer.`)) return;
    try {
      await supabase.from('splitsmart_gastos').delete().eq('grupo_id', g.id);
      await supabase.from('splitsmart_miembros').delete().eq('grupo_id', g.id);
      await supabase.from('splitsmart_chat').delete().eq('grupo_id', g.id);
      const { error } = await supabase.from('splitsmart_grupos').delete().eq('id', g.id);
      if (error) throw error;
      const nextGrupos = S.grupos.filter((_, i) => i !== idx);
      const nextIdx = Math.min(S.grupoIdx, Math.max(0, nextGrupos.length - 1));
      setS(prev => ({ ...prev, grupos: nextGrupos, grupoIdx: nextIdx }));
    } catch (err: any) {
      console.error(err);
      alert('Error eliminando grupo: ' + err.message);
    }
  };

  const abrirModalRecurrente = () => {
    setRecDesc('');
    setRecMonto('');
    setRecPagador('0');
    setRecFreq('mensual');
    setRecDia('1');
    setRecCat('comida');
    setIsRecModalOpen(true);
  };

  const guardarRecurrente = () => {
    const montoNum = parseFloat(recMonto);
    if (!recDesc.trim() || !montoNum) return;
    const proxima = new Date(new Date().getFullYear(), new Date().getMonth() + 1, parseInt(recDia) || 1);
    const nuevoRec = {
      id: 'r' + Date.now(),
      desc: recDesc.trim(),
      monto: montoNum,
      cat: recCat,
      pagador: parseInt(recPagador),
      freq: recFreq,
      dia: parseInt(recDia) || 1,
      activo: true,
      proximaFecha: proxima.toISOString().slice(0, 10)
    };

    const nextGrupos = S.grupos.map((x, idx) => {
      if (idx === S.grupoIdx) {
        return { ...x, recurrentes: [...x.recurrentes, nuevoRec] };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    setIsRecModalOpen(false);
  };

  // Invitar manual adding
  const añadirMiembro = () => {
    if (!nuevoMiembroNombre.trim()) return;
    if (grupo.miembros.includes(nuevoMiembroNombre.trim())) {
      alert('Ya existe');
      return;
    }
    const nextGrupos = S.grupos.map((x, idx) => {
      if (idx === S.grupoIdx) {
        return { ...x, miembros: [...x.miembros, nuevoMiembroNombre.trim()] };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    setNuevoMiembroNombre('');
    alert(`✅ ${nuevoMiembroNombre.trim()} añadido al grupo`);
  };

  const revocarEnlace = () => {
    const nextCode = grupo.nombre.slice(0, 3).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        return { ...x, invCode: nextCode };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    alert('Enlace revocado. Se generó uno nuevo.');
  };

  const revocarInvitacion = (email: string) => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        const nextInvs = x.invitaciones.filter((inv: any) => inv.email !== email);
        return { ...x, invitaciones: nextInvs };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
  };

  // Presupuesto modals & preview
  const abrirModalPresupuesto = () => {
    setPresMaximo(grupo.presupuesto.maximo.toString());
    setPresAlerta(grupo.presupuesto.alerta.toString());
    setPresDuracion(grupo.presupuesto.duracion.toString());
    setIsPresModalOpen(true);
  };

  const guardarPresupuesto = () => {
    const nextGrupos = S.grupos.map((x: any, idx: number) => {
      if (idx === S.grupoIdx) {
        return {
          ...x,
          presupuesto: {
            ...x.presupuesto,
            maximo: parseFloat(presMaximo) || 0,
            alerta: parseInt(presAlerta),
            duracion: parseInt(presDuracion)
          }
        };
      }
      return x;
    });
    setS(prev => ({ ...prev, grupos: nextGrupos }));
    setIsPresModalOpen(false);
  };

  // AI Summary Generator
  const generarResumenIA = (g: any) => {
    const total = g.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
    const porPagador = new Array(g.miembros.length).fill(0);
    const porCat = {} as any;
    g.gastos.forEach((x: any) => {
      const base = x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1);
      porPagador[x.pagador] += base;
      porCat[x.cat] = (porCat[x.cat] || 0) + base;
    });
    const maxIdx = porPagador.indexOf(Math.max(...porPagador));
    const minIdx = porPagador.indexOf(Math.min(...porPagador));
    const catSorted = Object.entries(porCat).sort((a: any, b: any) => b[1] - a[1]);
    const catTop = catSorted[0] as any;

    return {
      total,
      dias: new Set(g.gastos.map((x: any) => x.fecha)).size,
      miembros: g.miembros.length,
      analisis: {
        lider: `${g.miembros[maxIdx]} pagó más (${fmt(porPagador[maxIdx])})`,
        moderado: `${g.miembros[minIdx]} fue el más moderado (${fmt(porPagador[minIdx])})`,
        categoria: catTop ? `Categoría principal: ${CAT_ICONS[catTop[0] as keyof typeof CAT_ICONS]} ${catTop[0]} (${Math.round((catTop[1] / total) * 100)}%)` : ''
      },
      insights: [
        `🎯 Grupo de ${g.miembros.length} personas, ${g.gastos.length} gastos en ${new Set(g.gastos.map((x: any) => x.fecha)).size} día(s).`,
        `💡 ${g.miembros[maxIdx]} lideró los pagos. ¡Gracias por cuidar del grupo!`,
        `🏆 Total compartido: ${fmt(total)} (${fmt(total / g.miembros.length)}/persona).`
      ],
      personas: Object.fromEntries(g.miembros.map((m: any, i: number) => {
        const v = porPagador[i];
        const rol = i === maxIdx ? '💳 Pagador principal' : i === minIdx ? '✨ Más moderado' : '🤝 Socio equilibrado';
        return [m, `${rol} · ${fmt(v)} pagados`];
      }))
    };
  };

  const mostrarResumenIA = (gId: string) => {
    setIsResumenLoading(true);
    setResumenResult(null);
    setIsResumenModalOpen(true);

    setTimeout(() => {
      const g = S.grupos.find((x: any) => x.id === gId);
      if (g) {
        setResumenResult(generarResumenIA(g));
      }
      setIsResumenLoading(false);
    }, 1500);
  };

  // Recurrente forecasts preview calculations
  const previsionItems = [] as any[];
  if (grupo && grupo.recurrentes) {
    grupo.recurrentes.filter((r: any) => r.activo).forEach((r: any) => {
      for (let i = 0; i < 3; i++) {
        const d = new Date(r.proximaFecha);
        if (r.freq === 'mensual') d.setMonth(d.getMonth() + i);
        else if (r.freq === 'semanal') d.setDate(d.getDate() + i * 7);
        else d.setMonth(d.getMonth() + i * 2);
        previsionItems.push({ ...r, fecha: d.toISOString().slice(0, 10) });
      }
    });
    previsionItems.sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));
  }

  // Parse ubicacion — supports legacy keys (UBICACIONES) and new JSON {nombre,lat,lng}
  const parseUbicacion = (ub: string): { nombre: string; lat: number; lng: number } | null => {
    if (!ub) return null;
    if (UBICACIONES[ub as keyof typeof UBICACIONES]) return UBICACIONES[ub as keyof typeof UBICACIONES];
    try { const p = JSON.parse(ub); if (p?.lat && p?.lng) return p; } catch {}
    return null;
  };

  // Map calculations
  const gastosConUbicacion = grupo && grupo.gastos ? grupo.gastos.filter((x: any) => x.ubicacion && parseUbicacion(x.ubicacion)) : [];
  const porUbicacion = {} as any;
  if (gastosConUbicacion.length > 0) {
    gastosConUbicacion.forEach((x: any) => {
      if (!porUbicacion[x.ubicacion]) porUbicacion[x.ubicacion] = [];
      porUbicacion[x.ubicacion].push(x);
    });
  }

  const W = 800;
  const H = 360;
  let sc = 1, ox = 0, oy = 0, cLat = 0, cLng = 0;
  let hasCoords = false;

  if (gastosConUbicacion.length > 0) {
    const coords = gastosConUbicacion.map((x: any) => parseUbicacion(x.ubicacion)).filter(Boolean) as { nombre: string; lat: number; lng: number }[];
    if (coords.length > 0) {
      const lats = coords.map((c: any) => c.lat);
      const lngs = coords.map((c: any) => c.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const padLat = (maxLat - minLat) * 0.12 || 1;
      const padLng = (maxLng - minLng) * 0.12 || 1;
      const scL = H / (maxLat - minLat + padLat * 2);
      const scN = W / (maxLng - minLng + padLng * 2);
      sc = Math.min(scL, scN);
      cLat = (minLat + maxLat) / 2;
      cLng = (minLng + maxLng) / 2;
      ox = W / 2 - cLng * sc;
      oy = H / 2 - cLat * sc;
      hasCoords = true;
    }
  }

  // Draw lines
  const svgLines = [] as any[];
  if (S.mostrarRuta && hasCoords) {
    const ubOrden = [...new Map(grupo.gastos.filter((x: any) => x.ubicacion && parseUbicacion(x.ubicacion)).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha)).map((x: any) => [x.ubicacion, x])).values()];
    for (let i = 0; i < ubOrden.length - 1; i++) {
      const a = ubOrden[i] as any;
      const b = ubOrden[i + 1] as any;
      const ub1 = parseUbicacion(a.ubicacion);
      const ub2 = parseUbicacion(b.ubicacion);
      if (!ub1 || !ub2) continue;
      const x1 = ub1.lng * sc + ox;
      const y1 = H - (ub1.lat * sc + oy);
      const x2 = ub2.lng * sc + ox;
      const y2 = H - (ub2.lat * sc + oy);

      svgLines.push(
        <line
          key={`line-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="5,4"
          opacity="0.6"
        />
      );
    }
  }


  // QR Invite URL
  const inviteUrl = grupo && grupo.invCode ? `https://splitsmart.app/join?g=${grupo.invCode}` : '';
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteUrl)}`;

  // Navigation Premium link (Return back to Mi Hogar)
  return (
    <div className="splitsmart-wrapper">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/1.119.0/tabler-icons.min.css" />

      <style dangerouslySetInnerHTML={{ __html: `
        .splitsmart-wrapper {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          line-height: 1.5;
          padding-bottom: 80px;

          --bg: #ffffff;
          --bg2: #f8fafc;
          --bg3: #f1f5f9;
          --bg4: #e2e8f0;
          --border: #e2e8f0;
          --text: #0f172a;
          --text2: #475569;
          --text3: #94a3b8;
          --accent: #3B6D11;
          --accent2: #4a8a16;
          --green: #1a5c2e;
          --green2: #298A46;
          --red: #e24b4a;
          --orange: #F5C400;
          --orange2: #b87514;
          --blue: #1558a8;
          --purple: #1a5c2e;
          --pink: #b87514;
          --radius: 12px;
          --radius-sm: 8px;
          --shadow: 0 4px 24px rgba(0,0,0,0.4);
        }

        .splitsmart-wrapper * {
          box-sizing: border-box;
        }

        .splitsmart-wrapper header {
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(8px);
        }

        .splitsmart-wrapper .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .splitsmart-wrapper .logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent), var(--purple));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: white;
          box-shadow: 0 0 16px rgba(108,99,255,0.4);
        }

        .splitsmart-wrapper .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .splitsmart-wrapper .logo-ver {
          font-size: 11px;
          color: var(--text3);
          margin-left: 4px;
        }

        .splitsmart-wrapper .tab-pills {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .splitsmart-wrapper .tab-pill {
          padding: 7px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text2);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .splitsmart-wrapper .tab-pill:hover {
          background: var(--bg3);
          color: var(--text);
        }

        .splitsmart-wrapper .tab-pill.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .splitsmart-wrapper .main {
          flex: 1;
          padding: 20px;
          max-width: 960px;
          margin: 0 auto;
          width: 100%;
        }

        .splitsmart-wrapper .card {
          background: var(--bg2);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 16px;
          margin-bottom: 14px;
        }

        .splitsmart-wrapper .card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text2);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .splitsmart-wrapper .grid3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .splitsmart-wrapper .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .splitsmart-wrapper .stat {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px;
          text-align: center;
        }

        .splitsmart-wrapper .stat-label {
          font-size: 11px;
          color: var(--text3);
          margin-bottom: 6px;
        }

        .splitsmart-wrapper .stat-value {
          font-size: 22px;
          font-weight: 700;
        }

        .splitsmart-wrapper .grupo-card {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .splitsmart-wrapper .grupo-card:hover {
          border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: var(--shadow);
        }

        .splitsmart-wrapper .grupo-card.activo {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
        }

        .splitsmart-wrapper .grupo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .splitsmart-wrapper .grupo-avatar {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .splitsmart-wrapper .grupo-info {
          flex: 1;
          min-width: 0;
        }

        .splitsmart-wrapper .grupo-info h3 {
          font-size: 13px;
          font-weight: 600;
        }

        .splitsmart-wrapper .grupo-info p {
          font-size: 11px;
          color: var(--text2);
          margin-top: 2px;
        }

        .splitsmart-wrapper .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .splitsmart-wrapper .btn:hover {
          background: var(--bg4);
          border-color: var(--accent);
        }

        .splitsmart-wrapper .btn.primary {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }

        .splitsmart-wrapper .btn.primary:hover {
          opacity: 0.9;
        }

        .splitsmart-wrapper .btn.success {
          background: var(--green2);
          border-color: var(--green);
          color: #fff;
        }

        .splitsmart-wrapper .btn.danger {
          color: var(--red);
        }

        .splitsmart-wrapper .btn.sm {
          padding: 5px 10px;
          font-size: 11px;
        }

        .splitsmart-wrapper .btn-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .splitsmart-wrapper .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 10px;
        }

        .splitsmart-wrapper .form-group label {
          font-size: 12px;
          color: var(--text2);
          font-weight: 500;
        }

        .splitsmart-wrapper input,
        .splitsmart-wrapper select,
        .splitsmart-wrapper textarea {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          color: var(--text);
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
          width: 100%;
        }

        .splitsmart-wrapper input:focus,
        .splitsmart-wrapper select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .splitsmart-wrapper input::placeholder {
          color: var(--text3);
        }

        .splitsmart-wrapper .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .splitsmart-wrapper .budget-wrap {
          margin: 10px 0;
        }

        .splitsmart-wrapper .budget-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text2);
          margin-bottom: 5px;
        }

        .splitsmart-wrapper .budget-track {
          width: 100%;
          height: 20px;
          background: var(--bg);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border);
        }

        .splitsmart-wrapper .budget-fill {
          height: 100%;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          transition: width 0.5s ease;
        }

        .splitsmart-wrapper .budget-fill.ok {
          background: linear-gradient(90deg, #0F6E56, #1db974);
        }

        .splitsmart-wrapper .budget-fill.warn {
          background: linear-gradient(90deg, #ba7517, #ef9f27);
        }

        .splitsmart-wrapper .budget-fill.over {
          background: linear-gradient(90deg, #a32d2d, #e24b4a);
        }

        .splitsmart-wrapper .alerta {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          margin-bottom: 10px;
        }

        .splitsmart-wrapper .alerta.ok {
          background: rgba(29,185,116,0.1);
          color: var(--green);
          border-left: 3px solid var(--green);
        }

        .splitsmart-wrapper .alerta.warn {
          background: rgba(239,159,39,0.1);
          color: var(--orange);
          border-left: 3px solid var(--orange);
        }

        .splitsmart-wrapper .alerta.over {
          background: rgba(226,75,74,0.1);
          color: var(--red);
          border-left: 3px solid var(--red);
        }

        .splitsmart-wrapper .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--red);
          color: #fff;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .splitsmart-wrapper .chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          background: var(--bg3);
          border-radius: 999px;
          font-size: 11px;
          border: 1px solid var(--border);
        }

        .splitsmart-wrapper .chip.cat {
          background: var(--bg4);
        }

        .splitsmart-wrapper .gasto-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          border: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .splitsmart-wrapper .gasto-item:hover {
          border-color: var(--border);
        }

        .splitsmart-wrapper .gasto-item.highlight {
          border-color: var(--accent);
        }

        .splitsmart-wrapper .gasto-desc {
          flex: 1;
          min-width: 0;
        }

        .splitsmart-wrapper .gasto-desc h4 {
          font-size: 12px;
          font-weight: 500;
        }

        .splitsmart-wrapper .gasto-desc p {
          font-size: 10px;
          color: var(--text2);
          margin-top: 2px;
        }

        .splitsmart-wrapper .gasto-monto {
          font-size: 13px;
          font-weight: 700;
          color: var(--orange);
          text-align: right;
          white-space: nowrap;
        }

        .splitsmart-wrapper .reaction-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 4px 8px;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 999px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .splitsmart-wrapper .reaction-btn:hover {
          transform: scale(1.1);
        }

        .splitsmart-wrapper .reaction-btn.mine {
          background: rgba(108,99,255,0.2);
          border-color: var(--accent);
        }

        .splitsmart-wrapper .reaction-count {
          font-size: 10px;
          font-weight: 600;
          color: var(--text2);
        }

        .splitsmart-wrapper .emoji-picker {
          display: none;
          position: absolute;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          box-shadow: var(--shadow);
          z-index: 200;
          min-width: 260px;
        }

        .splitsmart-wrapper .emoji-picker.open {
          display: block;
        }

        .splitsmart-wrapper .emoji-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        .splitsmart-wrapper .emoji-opt {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          font-size: 20px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--bg3);
          transition: all 0.2s;
        }

        .splitsmart-wrapper .emoji-opt:hover {
          transform: scale(1.15);
          background: var(--bg4);
          border-color: var(--accent);
        }

        .splitsmart-wrapper .chat-messages {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 350px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .splitsmart-wrapper .msg {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .splitsmart-wrapper .msg.mine {
          align-self: flex-end;
          align-items: flex-end;
        }

        .splitsmart-wrapper .msg.otros {
          align-self: flex-start;
        }

        .splitsmart-wrapper .msg.sistema {
          align-self: center;
          max-width: 90%;
        }

        .splitsmart-wrapper .bubble {
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 12px;
          line-height: 1.5;
        }

        .splitsmart-wrapper .msg.mine .bubble {
          background: var(--accent);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .splitsmart-wrapper .msg.otros .bubble {
          background: var(--bg3);
          border-bottom-left-radius: 4px;
        }

        .splitsmart-wrapper .msg.sistema .bubble {
          background: rgba(239,159,39,0.15);
          color: var(--orange);
          font-size: 11px;
          text-align: center;
          border-radius: 8px;
        }

        .splitsmart-wrapper .msg-meta {
          font-size: 10px;
          color: var(--text3);
          margin-top: 3px;
        }

        .splitsmart-wrapper .msg-reactions {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .splitsmart-wrapper .map-container {
          width: 100%;
          height: 360px;
          background: var(--bg3);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .splitsmart-wrapper .map-svg {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .splitsmart-wrapper .map-markers {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .splitsmart-wrapper .marker {
          position: absolute;
          cursor: pointer;
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .splitsmart-wrapper .marker:hover {
          transform: scale(1.15) translateY(-4px);
          z-index: 10;
        }

        .splitsmart-wrapper .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          border: 2px solid rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          transform: rotate(-45deg);
        }

        .splitsmart-wrapper .marker-pin-inner {
          transform: rotate(45deg);
        }

        .splitsmart-wrapper .marker-label {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 9px;
          color: var(--text2);
          margin-top: 2px;
          white-space: nowrap;
        }

        .splitsmart-wrapper .map-popup {
          position: absolute;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px;
          min-width: 180px;
          box-shadow: var(--shadow);
          z-index: 100;
          font-size: 12px;
        }

        .splitsmart-wrapper .map-popup h4 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .splitsmart-wrapper .map-popup p {
          color: var(--text2);
          font-size: 11px;
        }

        .splitsmart-wrapper .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          z-index: 1000;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .splitsmart-wrapper .modal-overlay.open {
          display: flex;
        }

        .splitsmart-wrapper .modal-box {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 22px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: var(--shadow);
        }

        .splitsmart-wrapper .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .splitsmart-wrapper .modal-title {
          font-size: 15px;
          font-weight: 700;
        }

        .splitsmart-wrapper .btn-close {
          background: transparent;
          border: none;
          color: var(--text2);
          font-size: 18px;
          cursor: pointer;
          padding: 2px;
        }

        .splitsmart-wrapper .btn-close:hover {
          color: var(--text);
        }

        .splitsmart-wrapper .ai-section {
          margin-bottom: 14px;
          padding: 12px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
        }

        .splitsmart-wrapper .ai-section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text2);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .splitsmart-wrapper .ai-insight {
          padding: 8px 12px;
          background: rgba(108,99,255,0.1);
          border-left: 2px solid var(--accent);
          border-radius: 6px;
          font-size: 11px;
          line-height: 1.6;
          margin-bottom: 6px;
        }

        .splitsmart-wrapper .bstats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .splitsmart-wrapper .bstat {
          background: var(--bg);
          border-radius: var(--radius-sm);
          padding: 8px;
          text-align: center;
          border: 1px solid var(--border);
        }

        .splitsmart-wrapper .bstat-label {
          font-size: 9px;
          color: var(--text3);
        }

        .splitsmart-wrapper .bstat-value {
          font-size: 13px;
          font-weight: 700;
          margin-top: 2px;
        }

        .splitsmart-wrapper #qr-canvas {
          background: #fff;
          padding: 10px;
          border-radius: var(--radius-sm);
          display: inline-block;
        }

        .splitsmart-wrapper .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .splitsmart-wrapper .cal-day {
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
          background: var(--bg3);
        }

        .splitsmart-wrapper .cal-day:hover {
          border-color: var(--accent);
        }

        .splitsmart-wrapper .cal-day.hoy {
          border-color: var(--accent);
          color: var(--accent);
          font-weight: 700;
        }

        .splitsmart-wrapper .cal-day.tiene-gasto {
          background: rgba(108,99,255,0.15);
        }

        .splitsmart-wrapper .cal-day .cal-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--orange);
          margin-top: 2px;
        }

        .splitsmart-wrapper .cal-day.otro-mes {
          opacity: 0.3;
        }

        .splitsmart-wrapper .cal-header {
          font-size: 10px;
          color: var(--text3);
          text-align: center;
          padding: 4px 0;
          font-weight: 600;
        }

        .splitsmart-wrapper .recurrente-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          border: 1px solid var(--border);
        }

        .splitsmart-wrapper .rec-freq {
          font-size: 10px;
          color: var(--text3);
        }

        .splitsmart-wrapper .rec-toggle {
          width: 36px;
          height: 20px;
          background: var(--bg4);
          border-radius: 999px;
          position: relative;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .splitsmart-wrapper .rec-toggle.on {
          background: var(--green);
        }

        .splitsmart-wrapper .rec-toggle::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }

        .splitsmart-wrapper .rec-toggle.on::after {
          transform: translateX(16px);
        }

        .splitsmart-wrapper .invite-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
          font-size: 12px;
        }

        .splitsmart-wrapper .inv-estado {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .splitsmart-wrapper .inv-estado.aceptado {
          background: rgba(29,185,116,0.2);
          color: var(--green);
        }

        .splitsmart-wrapper .inv-estado.pendiente {
          background: rgba(239,159,39,0.2);
          color: var(--orange);
        }

        .splitsmart-wrapper .miembro-rol {
          padding: 8px 12px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
          font-size: 11px;
          margin-bottom: 6px;
          border-left: 2px solid var(--accent);
        }

        .splitsmart-wrapper .liquidacion-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
          font-size: 12px;
        }

        .splitsmart-wrapper .liq-arrow {
          color: var(--text3);
        }

        .splitsmart-wrapper .liq-monto {
          font-weight: 700;
          color: var(--green);
          margin-left: auto;
        }

        .splitsmart-wrapper .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .splitsmart-wrapper .inner-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .splitsmart-wrapper .inner-tab {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          font-size: 12px;
          color: var(--text2);
          cursor: pointer;
          transition: all 0.2s;
        }

        .splitsmart-wrapper .inner-tab:hover {
          background: var(--bg3);
        }

        .splitsmart-wrapper .inner-tab.active {
          background: var(--bg4);
          color: var(--text);
          border-color: var(--accent);
        }

        .splitsmart-wrapper .divisa-selector {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .splitsmart-wrapper .divisa-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text2);
          font-size: 11px;
          cursor: pointer;
        }

        .splitsmart-wrapper .divisa-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }

        .splitsmart-wrapper .proyeccion {
          padding: 10px;
          background: rgba(108,99,255,0.1);
          border: 1px solid rgba(108,99,255,0.2);
          border-radius: var(--radius-sm);
          font-size: 11px;
          margin-top: 8px;
        }

        .splitsmart-wrapper .chart-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .splitsmart-wrapper .chart-row:last-child {
          border-bottom: none;
        }

        .splitsmart-wrapper .chart-label {
          width: 70px;
          font-size: 11px;
          color: var(--text2);
        }

        .splitsmart-wrapper .chart-track {
          flex: 1;
          height: 16px;
          background: var(--bg-secondary);
          border-radius: 3px;
          overflow: hidden;
        }

        .splitsmart-wrapper .chart-fill {
          height: 100%;
          background: var(--color-info);
          border-radius: 3px;
        }

        .splitsmart-wrapper .chart-value {
          width: 50px;
          text-align: right;
          font-size: 11px;
          font-weight: 600;
        }

        .splitsmart-wrapper .hidden {
          display: none !important;
        }

        .splitsmart-wrapper .divider {
          height: 1px;
          background: var(--border);
          margin: 12px 0;
        }

        .splitsmart-wrapper .text-green {
          color: var(--green);
        }

        .splitsmart-wrapper .text-red {
          color: var(--red);
        }

        .splitsmart-wrapper .text-orange {
          color: var(--orange);
        }

        .splitsmart-wrapper .text-muted {
          color: var(--text2);
        }

        .splitsmart-wrapper .text-sm {
          font-size: 11px;
        }

        .splitsmart-wrapper .fw {
          font-weight: 600;
        }

        .splitsmart-wrapper .mt8 {
          margin-top: 8px;
        }

        .splitsmart-wrapper .mt12 {
          margin-top: 12px;
        }

        .splitsmart-wrapper .flex {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .splitsmart-wrapper .flex-sb {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .splitsmart-wrapper .grow {
          flex: 1;
          min-width: 0;
        }

        @media (max-width: 600px) {
          .splitsmart-wrapper .grid3 {
            grid-template-columns: 1fr 1fr;
          }

          .splitsmart-wrapper .bstats {
            grid-template-columns: 1fr 1fr;
          }

          .splitsmart-wrapper .tab-pills {
            width: 100%;
          }

          .splitsmart-wrapper .tab-pill {
            flex: 1;
            text-align: center;
          }

          .splitsmart-wrapper header {
            flex-wrap: wrap;
            gap: 10px;
          }
        }
      ` }} />

      {/* Return to Mi Hogar Button */}
      <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <Link href="/apps/mi-hogar" className="btn sm" style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
          <i className="ti ti-arrow-left"></i> Volver a Mi Hogar
        </Link>
      </div>

      <div className="app">
        {isLoadingGroups ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text2)' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}><i className="ti ti-loader ti-spin"></i></div>
            <p>Cargando grupos...</p>
          </div>
        ) : S.grupos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text2)' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '10px', fontSize: '24px' }}>Aún no tienes grupos</h2>
            <p style={{ marginBottom: '25px', maxWidth: '400px', margin: '0 auto 25px auto', lineHeight: '1.5' }}>
              Crea tu primer grupo para empezar a organizar tus gastos compartidos, viajes o pagos recurrentes de forma inteligente.
            </p>
            <button className="btn primary" style={{ padding: '12px 24px', fontSize: '15px' }} onClick={() => setIsNuevoGrupoModalOpen(true)}>
              <i className="ti ti-plus"></i> Crear Nuevo Grupo
            </button>
          </div>
        ) : (
          <>
            <header style={{ position: 'relative', justifyContent: 'center' }}>
          <div className="logo" style={{ position: 'absolute', left: '20px' }}>
            <span className="logo-text">Gastos compartidos</span>
          </div>
          <div className="tab-pills" style={{ margin: '0 auto', justifyContent: 'center' }}>
            <button className={`tab-pill ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Resumen</button>
            <button className={`tab-pill ${activeTab === 'grupo' ? 'active' : ''}`} onClick={() => setActiveTab('grupo')}>Grupo</button>
            <button className={`tab-pill ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              Chat {noLeidos > 0 && <span className="badge">{noLeidos}</span>}
            </button>
            <button className={`tab-pill ${activeTab === 'mapa' ? 'active' : ''}`} onClick={() => setActiveTab('mapa')}>Mapa</button>
            <button className={`tab-pill ${activeTab === 'recurrentes' ? 'active' : ''}`} onClick={() => setActiveTab('recurrentes')}>Recurrentes</button>
            <button className={`tab-pill ${activeTab === 'invitar' ? 'active' : ''}`} onClick={() => setActiveTab('invitar')}>Invitar</button>
            <button className={`tab-pill ${activeTab === 'presupuesto' ? 'active' : ''}`} onClick={() => setActiveTab('presupuesto')}>Presupuesto</button>
          </div>
        </header>

        <div className="main">
          {/* ══════════════════════════ DASHBOARD ══════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="grid3">
                <div className="stat">
                  <div className="stat-label">Te deben</div>
                  <div className="stat-value text-green">{fmt(deben)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Debes</div>
                  <div className="stat-value text-red">{fmt(debes)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Balance</div>
                  <div className="stat-value" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {balance >= 0 ? '+' : ''}{fmt(balance)}
                  </div>
                </div>
              </div>
              <div className="grid3" style={{ marginBottom: '14px' }}>
                <div className="stat">
                  <div className="stat-label">Gastado</div>
                  <div className="stat-value">{fmt(gastado)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Presupuesto</div>
                  <div className="stat-value">{fmt(presTotal)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Disponible</div>
                  <div className="stat-value" style={{ color: disponible >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(Math.max(disponible, 0))}
                  </div>
                </div>
              </div>

              {alertas.length > 0 && (
                <div>
                  {alertas.map((al, idx) => (
                    <div key={idx} className={`alerta ${al.tipo}`}>
                      <strong>{al.grupo}</strong>: {al.texto}
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div className="flex-sb" style={{ marginBottom: '12px' }}>
                  <div className="card-title" style={{ margin: 0 }}>Mis grupos</div>
                  <button className="btn sm success" onClick={() => setIsNuevoGrupoModalOpen(true)}>
                    <i className="ti ti-plus"></i> Nuevo
                  </button>
                </div>
                <div>
                  {S.grupos.map((g: any, i: number) => {
                    const tot = g.gastos.reduce((sum: number, x: any) => sum + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                    const pct = g.presupuesto.maximo > 0 ? Math.min((tot / g.presupuesto.maximo) * 100, 100) : 0;
                    const est = pct <= 50 ? 'ok' : pct <= 85 ? 'warn' : 'over';

                    return (
                      <div
                        key={g.id}
                        className={`grupo-card ${i === S.grupoIdx ? 'activo' : ''}`}
                        onClick={() => {
                          setS(prev => ({ ...prev, grupoIdx: i }));
                          setActiveTab('grupo');
                        }}
                      >
                        <div className="grupo-header">
                          <div className="grupo-avatar" style={{ background: `${avColor(i)}22`, fontSize: '20px' }}>{g.emoji}</div>
                          <div className="grupo-info">
                            <h3>{g.nombre}</h3>
                            <p>{g.miembros.length} personas · {g.gastos.length} gastos · {fmt(tot)}</p>
                          </div>
                          {g.cerrado && <span className="chip">Cerrado</span>}
                          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
                            <button
                              className="btn sm"
                              style={{ padding: '4px 8px', fontSize: '13px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                              onClick={(e) => abrirEditGrupo(i, e)}
                              title="Editar grupo"
                            >✏️</button>
                            <button
                              className="btn sm"
                              style={{ padding: '4px 8px', fontSize: '13px', color: 'var(--red)', borderColor: 'var(--red)' }}
                              onClick={(e) => eliminarGrupo(i, e)}
                              title="Eliminar grupo"
                            >🗑️</button>
                          </div>
                        </div>
                        {g.presupuesto.maximo > 0 && (
                          <div className="budget-wrap" style={{ marginTop: '8px' }}>
                            <div className="budget-labels">
                              <span>{fmt(tot)}</span>
                              <span>{fmt(g.presupuesto.maximo)}</span>
                            </div>
                            <div className="budget-track">
                              <div className={`budget-fill ${est}`} style={{ width: `${pct}%` }}>
                                {pct > 15 ? Math.round(pct) + '%' : ''}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Agenda del Día / Gastos ── */}
              {(() => {
                // Combine general database events with financial events
                const combinedItems: { label: string; sub?: string; color: string; icon: string; fecha?: string }[] = [];

                // 1. Add database events loaded from Supabase (Shifts, ITV, Seguro, Docs, Maintenance)
                agendaEvents.forEach(e => {
                  combinedItems.push({
                    label: e.label,
                    sub: e.sub,
                    color: e.color,
                    icon: e.icon,
                    fecha: e.fecha,
                  });
                });

                // 2. Add recurring expenses next 30 days
                const today = new Date();
                S.grupos.forEach(g => {
                  (g.recurrentes || []).filter((r: any) => r.activo).forEach((r: any) => {
                    const d = new Date(r.proximaFecha);
                    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                    if (diff >= 0 && diff <= 30) {
                      const label = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff}d`;
                      combinedItems.push({
                        label: r.desc,
                        sub: `${fmt(r.monto)} · ${label}`,
                        color: '#b87514', // food/recurrent bronze/amber
                        icon: CAT_ICONS[r.cat as keyof typeof CAT_ICONS] || '💸',
                        fecha: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                      });
                    }
                  });

                  // 3. Add budget alerts
                  const tot = g.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                  if (g.presupuesto.maximo > 0) {
                    const pct = (tot / g.presupuesto.maximo) * 100;
                    if (pct >= g.presupuesto.alerta) {
                      combinedItems.push({
                        label: `Límite: ${g.nombre}`,
                        sub: `${Math.round(pct)}% consumido`,
                        color: pct >= 100 ? '#dc2626' : '#ea580c',
                        icon: '⚠️',
                      });
                    }
                  }
                });

                const handleScroll = (dir: 'left' | 'right') => {
                  if (agendaScrollRef.current) {
                    const scrollAmount = 250;
                    agendaScrollRef.current.scrollBy({
                      left: dir === 'left' ? -scrollAmount : scrollAmount,
                      behavior: 'smooth'
                    });
                  }
                };

                return (
                  <div style={{ marginTop: '16px', background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '2px' }}>
                        AGENDA DEL DÍA
                      </div>
                      {combinedItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleScroll('left')} 
                            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.2s', padding: 0 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--border)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                          >
                            ◄
                          </button>
                          <button 
                            onClick={() => handleScroll('right')} 
                            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.2s', padding: 0 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--border)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                          >
                            ►
                          </button>
                        </div>
                      )}
                    </div>

                    {combinedItems.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                        📭 No hay eventos ni alertas para hoy
                      </div>
                    ) : (
                      <div 
                        ref={agendaScrollRef}
                        style={{
                          display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
                          scrollbarWidth: 'thin', msOverflowStyle: 'none', scrollBehavior: 'smooth'
                        }}
                        className="custom-agenda-scrollbar"
                      >
                        {combinedItems.map((item, i) => (
                          <div key={i} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                            background: `${item.color}15`, border: `1px solid ${item.color}30`,
                            color: item.color, whiteSpace: 'nowrap', cursor: 'default',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'transform 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            <span style={{ fontSize: '15px' }}>{item.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '12px', lineHeight: '1.2' }}>{item.label}</div>
                              {item.sub && <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500, marginTop: '2px' }}>{item.sub}</div>}
                            </div>
                            {item.fecha && (
                              <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px', fontWeight: 400 }}>· {item.fecha}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="card">
                <div className="card-title">Liquidación pendiente</div>
                <div>
                  {S.grupos.flatMap(g => liquidar(g).map(t => ({ ...t, grupo: g }))).length === 0 ? (
                    <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '12px' }}>✅ Todo saldado</p>
                  ) : (
                    S.grupos.flatMap(g => liquidar(g).map(t => ({ ...t, grupo: g }))).map((t, idx) => (
                      <div key={idx} className="liquidacion-item">
                        {avEl(t.grupo.miembros[t.de], t.de)}
                        <span>{t.grupo.miembros[t.de]}</span>
                        <span className="liq-arrow">→</span>
                        {avEl(t.grupo.miembros[t.a], t.a)}
                        <span>{t.grupo.miembros[t.a]}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>({t.grupo.nombre})</span>
                        <span className="liq-monto">{fmt(t.monto)}</span>
                        <button className="btn sm success" onClick={() => pagarLiquidacion(t.grupo.id, t.de, t.a, t.monto)}>Pagar</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════ GRUPO ══════════════════════════ */}
          {activeTab === 'grupo' && (
            <div>
              <div className="card">
                <div className="flex-sb" style={{ marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{grupo.emoji} {grupo.nombre}</h2>
                    <p className="text-sm text-muted">
                      {grupo.miembros.length} personas · {grupo.gastos.length} gastos · {fmt(grupo.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0))}
                    </p>
                  </div>
                  <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                    <select
                      className="btn"
                      style={{ padding: '6px 10px' }}
                      value={S.grupoIdx}
                      onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                    >
                      {S.grupos.map((g: any, i: number) => (
                        <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                      ))}
                    </select>
                    <button className="btn primary" onClick={abrirModalGasto}><i className="ti ti-plus"></i> Nuevo gasto</button>
                  </div>
                </div>

                <div className="inner-tabs">
                  <button className={`inner-tab ${activeGTab === 'gastos' ? 'active' : ''}`} onClick={() => setActiveGTab('gastos')}>Gastos</button>
                  <button className={`inner-tab ${activeGTab === 'saldar' ? 'active' : ''}`} onClick={() => setActiveGTab('saldar')}>Saldar</button>
                  <button className={`inner-tab ${activeGTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveGTab('stats')}>Stats</button>
                  <button className={`inner-tab ${activeGTab === 'miembros' ? 'active' : ''}`} onClick={() => setActiveGTab('miembros')}>Miembros</button>
                </div>

                {/* Gastos Tab */}
                {activeGTab === 'gastos' && (
                  <div>
                    <div className="flex" style={{ marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
                      <select
                        className="btn"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        value={filtroCat}
                        onChange={e => setFiltroCat(e.target.value)}
                      >
                        <option value="">Todas las categorías</option>
                        <option value="comida">🍽 Comida</option>
                        <option value="transporte">🚕 Transporte</option>
                        <option value="alojamiento">🏨 Alojamiento</option>
                        <option value="ocio">🎉 Ocio</option>
                        <option value="otros">📌 Otros</option>
                      </select>
                      <div className="divisa-selector" style={{ margin: 0 }}>
                        {Object.keys(DIVISAS).map((d: any) => (
                          <button
                            key={d}
                            className={`divisa-btn ${d === S.divisaBase ? 'active' : ''}`}
                            onClick={() => setS(prev => ({ ...prev, divisaBase: d }))}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      {grupo.gastos.filter((x: any) => !filtroCat || x.cat === filtroCat).length === 0 ? (
                        <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin gastos. Añade el primero!</p>
                      ) : (
                        grupo.gastos.filter((x: any) => !filtroCat || x.cat === filtroCat).map((x: any) => (
                          <div key={x.id} className="gasto-item" style={{ position: 'relative' }}>
                            <span style={{ fontSize: '18px' }}>{CAT_ICONS[x.cat as keyof typeof CAT_ICONS] || '📌'}</span>
                            <div className="gasto-desc">
                              <h4>{x.desc}</h4>
                              <p>{x.fecha} · {grupo.miembros[x.pagador]} · <span className="chip cat" style={{ fontSize: '9px' }}>{x.divisa}</span></p>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                                {Object.entries(x.reacciones || {}).map(([emoji, users]: any) => (
                                  <button
                                    key={emoji}
                                    className={`reaction-btn ${users.includes('Tú') ? 'mine' : ''}`}
                                    onClick={() => toggleReaccion(x.id, emoji)}
                                  >
                                    {emoji}<span className="reaction-count">{users.length}</span>
                                  </button>
                                ))}
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <button className="reaction-btn" onClick={() => setOpenPickerId(openPickerId === x.id ? null : x.id)}>➕</button>
                                  <div className={`emoji-picker ${openPickerId === x.id ? 'open' : ''}`}>
                                    <div className="emoji-grid">
                                      {EMOJIS.map((e: any) => (
                                        <div key={e} className="emoji-opt" onClick={() => addReaccion(x.id, e)}>{e}</div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <div className="gasto-monto">{fmtBase(x.monto, x.divisa)}</div>
                              <button
                                onClick={() => eliminarGasto(x.id)}
                                style={{ background: 'none', border: '1px solid var(--red)', borderRadius: '6px', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', padding: '2px 7px', opacity: 0.7 }}
                                title="Eliminar gasto"
                              >🗑️</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Saldar Tab */}
                {activeGTab === 'saldar' && (
                  <div>
                    {liquidar(grupo).length === 0 ? (
                      <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>✅ Nada que saldar</p>
                    ) : (
                      liquidar(grupo).map((t, idx) => (
                        <div key={idx} className="liquidacion-item">
                          {avEl(grupo.miembros[t.de], t.de)}
                          <div className="grow">
                            <strong>{grupo.miembros[t.de]}</strong> le debe <strong>{fmt(t.monto)}</strong> a <strong>{grupo.miembros[t.a]}</strong>
                          </div>
                          <button className="btn sm primary" onClick={() => registrarPago(t.de, t.a, t.monto)}>Pagar</button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Stats Tab */}
                {activeGTab === 'stats' && (
                  <div>
                    {(() => {
                      const tot = grupo.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                      const porCat = {} as any;
                      const porPagador = new Array(grupo.miembros.length).fill(0);
                      grupo.gastos.forEach((x: any) => {
                        const base = x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1);
                        porCat[x.cat] = (porCat[x.cat] || 0) + base;
                        porPagador[x.pagador] += base;
                      });
                      const maxCat = Math.max(...Object.values(porCat) as number[]) || 1;
                      const maxPag = Math.max(...porPagador) || 1;

                      return (
                        <div>
                          <div className="grid2" style={{ marginBottom: '12px' }}>
                            <div className="stat">
                              <div className="stat-label">Total</div>
                              <div className="stat-value" style={{ fontSize: '18px' }}>{fmt(tot)}</div>
                            </div>
                            <div className="stat">
                              <div className="stat-label">Promedio/persona</div>
                              <div className="stat-value" style={{ fontSize: '18px' }}>{fmt(tot / grupo.miembros.length)}</div>
                            </div>
                          </div>
                          <div className="card-title">Por categoría</div>
                          {Object.entries(porCat).map(([cat, v]: any) => (
                            <div key={cat} className="chart-row">
                              <span style={{ width: '80px', fontSize: '11px', color: 'var(--text2)' }}>
                                {CAT_ICONS[cat as keyof typeof CAT_ICONS]} {cat}
                              </span>
                              <div style={{ flex: 1, height: '14px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(v / maxCat) * 100}%`, height: '100%', background: CAT_COLORS[cat as keyof typeof CAT_COLORS], borderRadius: '4px' }}></div>
                              </div>
                              <span style={{ width: '55px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>{fmt(v)}</span>
                            </div>
                          ))}
                          <div className="card-title" style={{ marginTop: '14px' }}>Por persona</div>
                          {grupo.miembros.map((m: any, i: number) => (
                            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                              {avEl(m, i)}
                              <span style={{ width: '60px', fontSize: '11px' }}>{m}</span>
                              <div style={{ flex: 1, height: '14px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(porPagador[i] / maxPag) * 100}%`, height: '100%', background: avColor(i), borderRadius: '4px' }}></div>
                              </div>
                              <span style={{ width: '55px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>{fmt(porPagador[i])}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Miembros Tab */}
                {activeGTab === 'miembros' && (
                  <div>
                    {grupo.miembros.map((m: any, i: number) => {
                      const tot = grupo.gastos.filter((x: any) => x.pagador === i).reduce((sum: number, x: any) => sum + x.monto, 0);
                      return (
                        <div key={m} className="flex-sb" style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                          <div className="flex" style={{ gap: '10px' }}>
                            {avEl(m, i)}
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 500 }}>{m}</p>
                              <p className="text-sm text-muted">Pagó: {fmt(tot)}</p>
                            </div>
                          </div>
                          <span className="chip" style={{ background: 'rgba(29,185,116,0.1)', color: 'var(--green)', borderColor: 'var(--green)' }}>Miembro</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════ CHAT ══════════════════════════ */}
          {activeTab === 'chat' && (
            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '12px' }}>
                <div>
                  <div className="card-title" style={{ margin: 0 }}>💬 {grupo.nombre}</div>
                  <p className="text-sm text-muted">Mensajes en tiempo real</p>
                </div>
                <div className="flex" style={{ gap: '6px' }}>
                  <select
                    className="btn"
                    style={{ padding: '6px 10px' }}
                    value={S.grupoIdx}
                    onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                  >
                    {S.grupos.map((g: any, i: number) => (
                      <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                    ))}
                  </select>
                  <select
                    className="btn"
                    style={{ padding: '6px 10px' }}
                    value={yoChat}
                    onChange={e => setYoChat(e.target.value)}
                  >
                    {grupo.miembros.map((m: any) => (
                      <option key={m} value={m}>Como: {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="chat-messages">
                {grupo.chat.map((m: any) => {
                  const tipo = m.tipo === 'sistema' ? 'sistema' : m.autor === yoChat ? 'mine' : 'otros';
                  return (
                    <div key={m.id} className={`msg ${tipo}`}>
                      {tipo !== 'mine' && tipo !== 'sistema' && (
                        <span className="text-sm text-muted" style={{ marginBottom: '3px' }}>{m.autor}</span>
                      )}
                      <div className="bubble">{m.texto}</div>
                      {Object.keys(m.reacciones || {}).length > 0 && (
                        <div className="msg-reactions">
                          {Object.entries(m.reacciones || {}).map(([emoji, users]: any) => (
                            <button
                              key={emoji}
                              className={`reaction-btn ${users.includes(yoChat) ? 'mine' : ''}`}
                              onClick={() => toggleMsgReaccion(m.id, emoji)}
                              style={{ fontSize: '10px', padding: '2px 6px' }}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="msg-meta">{m.fecha}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {QUICK_REPLIES.map((qr: any) => (
                    <button
                      key={qr}
                      className="btn sm"
                      onClick={() => {
                        setChatInput(qr);
                      }}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  style={{ flex: 1 }}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') enviarMensaje();
                  }}
                />
                <button className="btn primary" onClick={enviarMensaje}><i className="ti ti-send"></i></button>
              </div>
            </div>
          )}

          {/* ══════════════════════════ MAPA ══════════════════════════ */}
          {activeTab === 'mapa' && (
            <div>
              {/* Header */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="flex-sb" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div className="card-title" style={{ margin: 0 }}>🗺️ Mapa de gastos — {grupo.nombre}</div>
                    <p className="text-sm text-muted" style={{ marginTop: '3px' }}>
                      Asigna ubicación al crear un gasto para verlo aquí
                    </p>
                  </div>
                  <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                    <select className="btn" style={{ padding: '6px 10px' }} value={S.grupoIdx} onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}>
                      {S.grupos.map((g: any, i: number) => <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>)}
                    </select>
                    <button className="btn sm primary" onClick={() => { setIsGastoModalOpen(true); }}>
                      <i className="ti ti-plus"></i> Añadir gasto
                    </button>
                  </div>
                </div>
              </div>

              {gastosConUbicacion.length === 0 ? (
                /* Estado vacío */
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '14px' }}>🗺️</div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Sin gastos con ubicación</h3>
                  <p className="text-sm text-muted" style={{ maxWidth: '320px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                    Al añadir un gasto, selecciona una ubicación en el campo <strong>"Ubicación (para mapa)"</strong> y aparecerá aquí como un marcador.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {['✈️ Viajes', '🏖️ Vacaciones', '🍽️ Restaurantes', '🚕 Transporte'].map((t: any) => (
                      <span key={t} className="chip" style={{ fontSize: '12px' }}>{t}</span>
                    ))}
                  </div>
                  <button className="btn primary" onClick={() => setIsGastoModalOpen(true)}>
                    <i className="ti ti-plus"></i> Añadir primer gasto con ubicación
                  </button>
                </div>
              ) : (
                <>
                  {/* Estadísticas globales */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div className="stat-label">Ciudades</div>
                      <div className="stat-value" style={{ fontSize: '22px' }}>{Object.keys(porUbicacion).length}</div>
                    </div>
                    <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div className="stat-label">Gastos</div>
                      <div className="stat-value" style={{ fontSize: '22px' }}>{gastosConUbicacion.length}</div>
                    </div>
                    <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div className="stat-label">Total viaje</div>
                      <div className="stat-value text-orange" style={{ fontSize: '20px' }}>{fmt(gastosConUbicacion.reduce((s: number, x: any) => s + x.monto, 0))}</div>
                    </div>
                  </div>

                  {/* Mapa */}
                  <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '12px' }}>
                    <MapComponent porUbicacion={porUbicacion} parseUbicacion={parseUbicacion} catColors={CAT_COLORS} catIcons={CAT_ICONS} />
                    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Categorías:</span>
                      {[...new Set(gastosConUbicacion.map((x: any) => x.cat))].map((c: any) => (
                        <span key={c} className="chip" style={{ fontSize: '11px', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[c as keyof typeof CAT_COLORS], display: 'inline-block' }}></span>
                          {CAT_ICONS[c as keyof typeof CAT_ICONS]} {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tarjetas por ciudad */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                    {Object.entries(porUbicacion).map(([ub, gastos]: any) => {
                      const ubInfo = parseUbicacion(ub);
                      const tot = gastos.reduce((s: number, x: any) => s + x.monto, 0);
                      const porCat: Record<string, number> = {};
                      gastos.forEach((x: any) => { porCat[x.cat] = (porCat[x.cat] || 0) + x.monto; });
                      const topCat = Object.entries(porCat).sort((a: any, b: any) => b[1] - a[1])[0];
                      const topColor = CAT_COLORS[topCat[0] as keyof typeof CAT_COLORS] || '#3B6D11';
                      return (
                        <div key={ub} className="card" style={{ padding: '14px', borderTop: `3px solid ${topColor}` }}>
                          <div className="flex-sb" style={{ marginBottom: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{ubInfo?.nombre || ub}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{gastos.length} gasto{gastos.length !== 1 ? 's' : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '16px', color: topColor }}>{fmt(tot)}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{CAT_ICONS[topCat[0] as keyof typeof CAT_ICONS] || '📌'} {topCat[0]}</div>
                            </div>
                          </div>
                          {/* Barra de categorías */}
                          <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '1px', marginBottom: '10px' }}>
                            {Object.entries(porCat).map(([cat, v]: any) => (
                              <div key={cat} style={{ flex: v, background: CAT_COLORS[cat as keyof typeof CAT_COLORS] || '#ccc', minWidth: '4px' }} title={`${cat}: ${fmt(v)}`} />
                            ))}
                          </div>
                          {/* Lista de gastos */}
                          {gastos.map((x: any) => (
                            <div key={x.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ color: 'var(--text2)', fontSize: '12px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {CAT_ICONS[x.cat as keyof typeof CAT_ICONS] || '📌'} {x.desc}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: '12px', color: CAT_COLORS[x.cat as keyof typeof CAT_COLORS] || 'var(--text)' }}>{fmt(x.monto)}</span>
                                <button
                                  onClick={(e) => abrirEditGasto(x, e)}
                                  title="Editar gasto"
                                  style={{ background: 'none', border: '1px solid var(--accent)', borderRadius: '5px', color: 'var(--accent)', cursor: 'pointer', fontSize: '11px', padding: '1px 6px', lineHeight: 1.5 }}
                                >✏️</button>
                                <button
                                  onClick={() => eliminarGasto(x.id)}
                                  title="Eliminar gasto"
                                  style={{ background: 'none', border: '1px solid var(--red)', borderRadius: '5px', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', padding: '1px 6px', lineHeight: 1.5 }}
                                >🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════ RECURRENTES ══════════════════════════ */}
          {activeTab === 'recurrentes' && (
            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="card-title" style={{ margin: 0 }}>Gastos recurrentes</div>
                  <p className="text-sm text-muted">Pagos automáticos periódicos</p>
                </div>
                <div className="flex" style={{ gap: '6px' }}>
                  <select
                    className="btn"
                    style={{ padding: '6px 10px' }}
                    value={S.grupoIdx}
                    onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                  >
                    {S.grupos.map((g: any, i: number) => (
                      <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                    ))}
                  </select>
                  <button className="btn primary" onClick={abrirModalRecurrente}><i className="ti ti-plus"></i> Nuevo</button>
                </div>
              </div>

              <div className="inner-tabs">
                <button className={`inner-tab ${activeRecTab === 'lista' ? 'active' : ''}`} onClick={() => setActiveRecTab('lista')}>Lista</button>
                <button className={`inner-tab ${activeRecTab === 'prevision' ? 'active' : ''}`} onClick={() => setActiveRecTab('prevision')}>Previsión</button>
                <button className={`inner-tab ${activeRecTab === 'calendario' ? 'active' : ''}`} onClick={() => setActiveRecTab('calendario')}>Calendario</button>
              </div>

              {activeRecTab === 'lista' && (
                <div>
                  {grupo?.recurrentes?.length === 0 ? (
                    <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin gastos recurrentes. Añade uno!</p>
                  ) : (
                    grupo?.recurrentes?.map((r: any) => {
                      const diasFaltan = Math.ceil((new Date(r.proximaFecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={r.id} className="recurrente-item">
                          <span style={{ fontSize: '18px' }}>{CAT_ICONS[r.cat as keyof typeof CAT_ICONS]}</span>
                          <div className="grow">
                            <p style={{ fontSize: '12px', fontWeight: 500 }}>{r.desc}</p>
                            <p className="text-sm text-muted">{fmt(r.monto)} · {r.freq} · próximo: {r.proximaFecha} {diasFaltan > 0 ? `(${diasFaltan}d)` : ' 🔴'}</p>
                          </div>
                          <div className={`rec-toggle ${r.activo ? 'on' : ''}`} onClick={() => toggleRecurrente(r.id)}></div>
                          <button className="btn sm danger" onClick={() => eliminarRecurrente(r.id)}><i className="ti ti-trash"></i></button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeRecTab === 'prevision' && (
                <div>
                  {previsionItems.length === 0 ? (
                    <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin recurrentes activos</p>
                  ) : (
                    previsionItems.slice(0, 10).map((r: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: i === 0 ? 'rgba(108,99,255,0.1)' : 'var(--bg3)', border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{CAT_ICONS[r.cat as keyof typeof CAT_ICONS]}</span>
                        <div className="grow">
                          <p style={{ fontSize: '12px', fontWeight: 500 }}>{r.desc}</p>
                          <p className="text-sm text-muted">{r.fecha}</p>
                        </div>
                        <span className="text-orange fw">{fmt(r.monto)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeRecTab === 'calendario' && (
                <div>
                  <div className="flex-sb" style={{ marginBottom: '10px' }}>
                    <button className="btn sm" onClick={() => handleCalMes(-1)}><i className="ti ti-chevron-left"></i></button>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {calFechaActual.toLocaleString('es', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="btn sm" onClick={() => handleCalMes(1)}><i className="ti ti-chevron-right"></i></button>
                  </div>
                  <div className="cal-grid">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d: any) => (
                      <div key={d} className="cal-header">{d}</div>
                    ))}
                    {renderCalendarioGrid()}
                  </div>
                  {selectedCalDate && (
                    <div style={{ marginTop: '12px' }}>
                      <div className="card-title" style={{ marginBottom: '8px' }}>{selectedCalDate}</div>
                      {grupo.gastos.filter((x: any) => x.fecha === selectedCalDate).length === 0 ? (
                        <p className="text-sm text-muted">Sin gastos este día</p>
                      ) : (
                        grupo.gastos.filter((x: any) => x.fecha === selectedCalDate).map((x: any) => (
                          <div key={x.id} className="flex-sb text-sm" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                            <span>{CAT_ICONS[x.cat as keyof typeof CAT_ICONS]} {x.desc}</span>
                            <span className="text-orange fw">{fmt(x.monto)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ INVITAR ══════════════════════════ */}
          {activeTab === 'invitar' && (
            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="card-title" style={{ margin: 0 }}>Invitar al grupo</div>
                  <p className="text-sm text-muted">Comparte enlace o QR</p>
                </div>
                <select
                  className="btn"
                  style={{ padding: '6px 10px' }}
                  value={S.grupoIdx}
                  onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                >
                  {S.grupos.map((g: any, i: number) => (
                    <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="inner-tabs">
                <button className={`inner-tab ${activeInvTab === 'enlace' ? 'active' : ''}`} onClick={() => setActiveInvTab('enlace')}>Enlace / QR</button>
                <button className={`inner-tab ${activeInvTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveInvTab('historial')}>Invitados</button>
                <button className={`inner-tab ${activeInvTab === 'miembros-inv' ? 'active' : ''}`} onClick={() => setActiveInvTab('miembros-inv')}>Miembros</button>
              </div>

              {activeInvTab === 'enlace' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div id="qr-canvas" style={{ display: 'inline-block', marginBottom: '12px' }}>
                    <img src={qrCodeApiUrl} alt="QR Code" style={{ width: '160px', height: '160px' }} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', wordBreak: 'break-all' }}>{inviteUrl}</p>
                    <div className="btn-row" style={{ justifyContent: 'center' }}>
                      <button className="btn primary" onClick={() => {
                        navigator.clipboard?.writeText(inviteUrl);
                        alert('✅ Enlace copiado!');
                      }}><i className="ti ti-copy"></i> Copiar enlace</button>
                      <button className="btn" onClick={() => alert(`Comparte este enlace: ${inviteUrl}`)}><i className="ti ti-share-2"></i> Compartir</button>
                      <button className="btn" onClick={() => window.open(qrCodeApiUrl)}><i className="ti ti-download"></i> QR</button>
                    </div>
                  </div>
                  <p className="text-sm text-muted" style={{ marginTop: '10px' }}>
                    ⚠️ Cualquiera con el enlace puede unirse. <button className="btn sm danger" onClick={revocarEnlace} style={{ display: 'inline-flex' }}>Revocar</button>
                  </p>
                </div>
              )}

              {activeInvTab === 'historial' && (
                <div>
                  {grupo.invitaciones.map((inv: any) => (
                    <div key={inv.email} className="invite-item">
                      <div className="grow">
                        <p style={{ fontSize: '12px', fontWeight: 500 }}>{inv.email}</p>
                        <p className="text-sm text-muted">{inv.fecha}</p>
                      </div>
                      <span className={`inv-estado ${inv.estado}`}>{inv.estado}</span>
                      {inv.estado === 'pendiente' && (
                        <button className="btn sm" onClick={() => alert(`📬 Recordatorio enviado a ${inv.email}`)}>Recordatorio</button>
                      )}
                      <button className="btn sm danger" onClick={() => revocarInvitacion(inv.email)}><i className="ti ti-x"></i></button>
                    </div>
                  ))}
                </div>
              )}

              {activeInvTab === 'miembros-inv' && (
                <div>
                  {grupo.miembros.map((m: any, i: number) => {
                    const inv = grupo.invitaciones.find((x: any) => x.email.split('@')[0] === m.toLowerCase());
                    const estado = m === 'Tú' ? 'aceptado' : (inv?.estado || 'aceptado');

                    return (
                      <div key={m} className="flex-sb" style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '6px' }}>
                        <div className="flex">
                          {avEl(m, i)}
                          <span style={{ fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>{m}</span>
                        </div>
                        <span className={`inv-estado ${estado}`}>{estado}</span>
                      </div>
                    );
                  })}
                  <div className="divider"></div>
                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>Añadir miembro manualmente</label>
                    <div className="flex" style={{ gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nombre..."
                        value={nuevoMiembroNombre}
                        onChange={e => setNuevoMiembroNombre(e.target.value)}
                      />
                      <button className="btn primary" onClick={añadirMiembro}><i className="ti ti-plus"></i></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ PRESUPUESTO ══════════════════════════ */}
          {activeTab === 'presupuesto' && (
            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="card-title" style={{ margin: 0 }}>Control de presupuesto</div>
                  <p className="text-sm text-muted">Límites y alertas de gasto</p>
                </div>
                <div className="flex" style={{ gap: '6px' }}>
                  <select
                    className="btn"
                    style={{ padding: '6px 10px' }}
                    value={S.grupoIdx}
                    onChange={e => setS(prev => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                  >
                    {S.grupos.map((g: any, i: number) => (
                      <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                    ))}
                  </select>
                  <button className="btn primary" onClick={abrirModalPresupuesto}><i className="ti ti-settings"></i> Editar</button>
                  <button className="btn success" onClick={() => mostrarResumenIA(grupo.id)}><i className="ti ti-chart-pie"></i> Resumen IA</button>
                </div>
              </div>

              {(() => {
                const gasto = grupo.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                const { maximo, alerta, duracion, fechaInicio } = grupo.presupuesto;
                const pct = maximo > 0 ? (gasto / maximo) * 100 : 0;
                const est = pct <= 50 ? 'ok' : pct <= 85 ? 'warn' : 'over';
                const disp = maximo - gasto;
                const diasTranscurridos = Math.max(1, Math.ceil((new Date().getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)));
                const ritmo = gasto / diasTranscurridos;
                const proyeccion = ritmo * duracion;
                const alertaTexto = maximo > 0 && pct >= alerta
                  ? (pct >= 100 ? `❌ Presupuesto excedido. Gastaste ${fmt(gasto)} de ${fmt(maximo)}` : `⚠️ ${Math.round(pct)}% del presupuesto usado (${fmt(gasto)} de ${fmt(maximo)})`)
                  : null;

                return (
                  <div>
                    {alertaTexto && <div className={`alerta ${est}`} style={{ marginBottom: '12px' }}>{alertaTexto}</div>}
                    <div className="budget-wrap">
                      <div className="budget-labels">
                        <span>{fmt(gasto)} gastado</span>
                        <span>{fmt(maximo)} máximo</span>
                      </div>
                      <div className="budget-track">
                        <div className={`budget-fill ${est}`} style={{ width: `${Math.min(pct, 100)}%` }}>
                          {pct > 10 ? Math.round(pct) + '%' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="bstats">
                      <div className="bstat">
                        <div className="bstat-label">Gastado</div>
                        <div className="bstat-value">{fmt(gasto)}</div>
                      </div>
                      <div className="bstat">
                        <div className="bstat-label">Disponible</div>
                        <div className="bstat-value" style={{ color: disp >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(Math.max(disp, 0))}</div>
                      </div>
                      <div className="bstat">
                        <div className="bstat-label">Límite</div>
                        <div className="bstat-value">{fmt(maximo)}</div>
                      </div>
                      <div className="bstat">
                        <div className="bstat-label">Estado</div>
                        <div className="bstat-value">{est === 'ok' ? '✓' : est === 'warn' ? '⚠️' : '❌'}</div>
                      </div>
                    </div>
                    <div className="proyeccion">
                      <strong>Proyección:</strong> Al ritmo actual ({fmt(ritmo)}/día), gastarás {fmt(proyeccion)} en {duracion} días (vs {fmt(maximo)} presupuestado).
                    </div>
                    <div className="card-title" style={{ marginTop: '14px', marginBottom: '8px' }}>Últimos gastos</div>
                    {grupo.gastos.slice(-5).reverse().map((x: any) => (
                      <div key={x.id} className="flex-sb text-sm" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{CAT_ICONS[x.cat as keyof typeof CAT_ICONS]} {x.desc}</span>
                        <span className="text-orange fw">{fmt(x.monto)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="divider"></div>
              <div className="flex-sb" style={{ marginBottom: '8px' }}>
                <div className="card-title">Todos los grupos</div>
                <button className="btn sm primary" onClick={() => setIsNuevoGrupoModalOpen(true)}>+ Nuevo</button>
              </div>
              <div>
                {S.grupos.map((g2: any) => {
                  const gasto2 = g2.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                  const pct2 = g2.presupuesto.maximo > 0 ? Math.min((gasto2 / g2.presupuesto.maximo) * 100, 100) : 0;
                  const est2 = pct2 <= 50 ? 'ok' : pct2 <= 85 ? 'warn' : 'over';
                  return (
                    <div key={g2.id} style={{ marginBottom: '10px' }}>
                      <div className="flex-sb text-sm" style={{ margin: '4px 0' }}>
                        <span>{g2.emoji} {g2.nombre}</span>
                        <span>{fmt(gasto2)} / {fmt(g2.presupuesto.maximo)}</span>
                      </div>
                      <div className="budget-track">
                        <div className={`budget-fill ${est2}`} style={{ width: `${pct2}%` }}>
                          {pct2 > 15 ? Math.round(pct2) + '%' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* ══════════════════════════ MODALES ══════════════════════════ */}

      {/* ══════════════════════════ MODAL NUEVO GRUPO ══════════════════════════ */}
      <div className={`modal-overlay ${isNuevoGrupoModalOpen ? 'open' : ''}`} onClick={() => setIsNuevoGrupoModalOpen(false)}>
        <div className="modal-box" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
          {/* Header con preview */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 4px 14px rgba(59,109,17,0.35)' }}>
                {nuevoGrupoEmoji || '💸'}
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{nuevoGrupoNombre || 'Nuevo Grupo'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Vista previa</div>
              </div>
            </div>
            <button className="btn-close" onClick={() => setIsNuevoGrupoModalOpen(false)}>✕</button>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Nombre del grupo</label>
            <input
              type="text"
              placeholder="Ej: Viaje a Roma, Piso compartido..."
              value={nuevoGrupoNombre}
              onChange={e => setNuevoGrupoNombre(e.target.value)}
              style={{ fontSize: '15px' }}
              autoFocus
            />
          </div>

          {/* Emoji picker */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', marginBottom: '10px', display: 'block' }}>Elige un icono</label>
            {[
              { id: 'viajes',  label: '✈️ Viajes',         emojis: ['✈️','🌍','🏖️','🗺️','🏔️','🏕️','🚂','🚢','🛵','🏰','🗽','🌴','🎒','🧳','🌅','🏄','🎿','🚁','🌊','🏜️','🌋','🗿','🎑','⛩️'] },
              { id: 'hogar',   label: '🏠 Hogar',           emojis: ['🏠','🏡','🏢','🛋️','🛏️','🍽️','🧹','🔑','💡','🌿','🪴','🐾','👨‍👩‍👧','👨‍👩‍👦','👫','🎮','📺','🧺','🚿','🛁','🪞','🧲','🔧','🪣'] },
              { id: 'dinero',  label: '💰 Dinero y trabajo', emojis: ['💸','💰','💳','🏦','📊','💼','👔','🤝','📈','🎯','🏆','💎','🪙','💵','🧾','🤑','📋','⚡','📦','🛒','🏪','🏬','📱','💻'] },
              { id: 'ocio',    label: '🎉 Ocio y social',   emojis: ['🎉','🍻','🍕','🎸','🎬','🎤','⚽','🏋️','🎂','🥂','🎭','🃏','🎠','🎪','🏟️','🎡','🌮','🍣','🍜','🥗','🍔','🍷','☕','🧁'] },
              { id: 'natura',  label: '🌱 Naturaleza',      emojis: ['🌱','🌸','🍀','🌻','🦋','🐶','🐱','🐰','🦊','🐻','🐼','🦁','🐬','🦅','🌈','⭐','🌙','☀️','🍂','❄️','🌊','🔥','🌵','🍄'] },
              { id: 'otros',   label: '✨ Otros',            emojis: ['✨','🎓','📚','🏥','💊','🚗','🚲','⛽','🎁','💌','📸','🎨','🧩','🔮','🪄','🛡️','⚔️','🧸','🪆','🎵','🎻','🥁','🛺','🪂'] },
            ].map(cat => (
              <div key={cat.id} style={{ marginBottom: '6px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setEmojiCatOpen(emojiCatOpen === cat.id ? null : cat.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: emojiCatOpen === cat.id ? 'rgba(59,109,17,0.06)' : 'var(--bg3)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}
                >
                  <span>{cat.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: emojiCatOpen === cat.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>
                {emojiCatOpen === cat.id && (
                  <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
                    {cat.emojis.map(e => (
                      <button key={e} onClick={() => setNuevoGrupoEmoji(e)} style={{ width: '36px', height: '36px', border: nuevoGrupoEmoji === e ? '2px solid var(--accent)' : '1.5px solid var(--border)', borderRadius: '8px', background: nuevoGrupoEmoji === e ? 'rgba(59,109,17,0.15)' : 'var(--bg3)', fontSize: '18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn" style={{ flex: 1, padding: '11px' }} onClick={() => setIsNuevoGrupoModalOpen(false)}>Cancelar</button>
            <button
              className="btn primary"
              style={{ flex: 2, padding: '11px', fontSize: '15px', fontWeight: 700, opacity: nuevoGrupoNombre.trim() ? 1 : 0.5 }}
              onClick={crearGrupo}
              disabled={!nuevoGrupoNombre.trim()}
            >
              ✨ Crear Grupo
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ MODAL GASTO ══════════════════════════ */}
      <div className={`modal-overlay ${isGastoModalOpen ? 'open' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <span className="modal-title">Nuevo gasto</span>
            <button className="btn-close" onClick={() => setIsGastoModalOpen(false)}>✕</button>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Cena en Lisboa..."
              value={gastoDesc}
              onChange={e => setGastoDesc(e.target.value)}
            />
          </div>
          <div className="grid2">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={gastoMonto}
                onChange={e => setGastoMonto(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Divisa</label>
              <select value={gastoDivisa} onChange={e => setGastoDivisa(e.target.value)}>
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
                <option value="JPY">¥ JPY</option>
                <option value="MXN">M$ MXN</option>
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="form-group">
              <label>Pagado por</label>
              <select value={gastoPagador} onChange={e => setGastoPagador(e.target.value)}>
                {grupo?.miembros?.map((m: string, idx: number) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select value={gastoCat} onChange={e => setGastoCat(e.target.value)}>
                <option value="comida">🍽 Comida</option>
                <option value="transporte">🚕 Transporte</option>
                <option value="alojamiento">🏨 Alojamiento</option>
                <option value="ocio">🎉 Ocio</option>
                <option value="otros">📌 Otros</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>📍 Ubicación (para mapa)</label>
            {gastoUbicacion ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(59,109,17,0.08)', border: '1.5px solid var(--accent)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '13px', flex: 1, color: 'var(--text)', fontWeight: 500 }}>
                  📍 {parseUbicacion(gastoUbicacion)?.nombre || gastoUbicacion}
                </span>
                <button onClick={() => { setGastoUbicacion(''); setLocationQuery(''); setLocationResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '15px', padding: '0 2px' }}>✕</button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Ej: Castellón, Bar El Rincón, Calle Mayor..."
                    value={locationQuery}
                    onChange={e => {
                      const q = e.target.value;
                      setLocationQuery(q);
                      setLocationResults([]);
                      if (locationDebounce.current) clearTimeout(locationDebounce.current);
                      if (q.length < 2) { setLocationSearching(false); return; }
                      setLocationSearching(true);
                      locationDebounce.current = setTimeout(async () => {
                        try {
                          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
                          const data = await res.json();
                          setLocationResults(data);
                        } catch (err) {
                          console.error('Geocode error:', err);
                        }
                        setLocationSearching(false);
                      }, 400);
                    }}
                  />
                  {locationSearching && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text3)' }}>Buscando...</span>
                  )}
                </div>
                {locationResults.length > 0 && (
                  <div style={{ marginTop: '4px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg2)' }}>
                    {locationResults.map((r, i) => (
                      <button key={i} onClick={() => {
                        setGastoUbicacion(JSON.stringify({ nombre: r.nombre, lat: r.lat, lng: r.lng }));
                        setLocationQuery('');
                        setLocationResults([]);
                      }} style={{ display: 'block', width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>📍 {r.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.display}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>División</label>
            <select value={gastoDivision} onChange={e => setGastoDivision(e.target.value)}>
              <option value="igual">Igual entre todos</option>
              <option value="porcentaje">Por porcentaje</option>
              <option value="exacto">Monto exacto</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setIsGastoModalOpen(false)}>Cancelar</button>
            <button className="btn primary" style={{ flex: 1 }} onClick={guardarGasto}>Guardar</button>
          </div>
        </div>
      </div>

      {/* Modal Recurrente */}
      <div className={`modal-overlay ${isRecModalOpen ? 'open' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <span className="modal-title">Nuevo gasto recurrente</span>
            <button className="btn-close" onClick={() => setIsRecModalOpen(false)}>✕</button>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Netflix, Internet..."
              value={recDesc}
              onChange={e => setRecDesc(e.target.value)}
            />
          </div>
          <div className="grid2">
            <div className="form-group">
              <label>Monto (€)</label>
              <input
                type="number"
                placeholder="0.00"
                value={recMonto}
                onChange={e => setRecMonto(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pagador</label>
              <select value={recPagador} onChange={e => setRecPagador(e.target.value)}>
                {grupo?.miembros?.map((m: string, idx: number) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="form-group">
              <label>Frecuencia</label>
              <select value={recFreq} onChange={e => setRecFreq(e.target.value)}>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="bimensual">Bimensual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Día del mes</label>
              <input
                type="number"
                min="1"
                max="31"
                value={recDia}
                onChange={e => setRecDia(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select value={recCat} onChange={e => setRecCat(e.target.value)}>
              <option value="comida">🍽 Comida</option>
              <option value="transporte">🚕 Transporte</option>
              <option value="alojamiento">🏨 Alojamiento</option>
              <option value="ocio">🎉 Ocio</option>
              <option value="otros">📌 Otros</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setIsRecModalOpen(false)}>Cancelar</button>
            <button className="btn primary" style={{ flex: 1 }} onClick={guardarRecurrente}>Guardar</button>
          </div>
        </div>
      </div>

      {/* Modal Presupuesto */}
      <div className={`modal-overlay ${isPresModalOpen ? 'open' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <span className="modal-title">Editar presupuesto: {grupo?.nombre}</span>
            <button className="btn-close" onClick={() => setIsPresModalOpen(false)}>✕</button>
          </div>
          <div className="form-group">
            <label>Presupuesto máximo (€)</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={presMaximo}
              onChange={e => setPresMaximo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Alertar cuando alcance (%)</label>
            <select value={presAlerta} onChange={e => setPresAlerta(e.target.value)}>
              <option value="50">50% — Mitad</option>
              <option value="75">75% — Tres cuartos</option>
              <option value="90">90% — Casi lleno</option>
            </select>
          </div>
          <div className="form-group">
            <label>Duración del período</label>
            <select value={presDuracion} onChange={e => setPresDuracion(e.target.value)}>
              <option value="7">1 semana</option>
              <option value="14">2 semanas</option>
              <option value="30">1 mes</option>
              <option value="60">2 meses</option>
            </select>
          </div>
          {parseFloat(presMaximo) > 0 && (
            <div className="proyeccion">
              📊 Presupuesto: {fmt(parseFloat(presMaximo))} · Alerta al {presAlerta}% ({fmt(parseFloat(presMaximo) * parseFloat(presAlerta) / 100)})
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setIsPresModalOpen(false)}>Cancelar</button>
            <button className="btn primary" style={{ flex: 1 }} onClick={guardarPresupuesto}>Guardar</button>
          </div>
        </div>
      </div>

      {/* Modal Resumen IA */}
      <div className={`modal-overlay ${isResumenModalOpen ? 'open' : ''}`}>
        <div className="modal-box" style={{ maxWidth: '540px' }}>
          <div className="modal-header">
            <span className="modal-title">Resumen del grupo</span>
            <button className="btn-close" onClick={() => setIsResumenModalOpen(false)}>✕</button>
          </div>
          {isResumenLoading && (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              <p className="text-sm text-muted">Generando resumen con IA...</p>
            </div>
          )}
          {!isResumenLoading && resumenResult && (
            <div>
              <div className="ai-section">
                <div className="ai-section-title"><i className="ti ti-chart-bar"></i> Estadísticas</div>
                <div className="grid2">
                  <div className="bstat"><div className="bstat-label">Total</div><div className="bstat-value">{fmt(resumenResult.total)}</div></div>
                  <div className="bstat"><div className="bstat-label">Promedio/persona</div><div className="bstat-value">{fmt(resumenResult.total / resumenResult.miembros)}</div></div>
                  <div className="bstat"><div className="bstat-label">Días</div><div className="bstat-value">{resumenResult.dias}</div></div>
                  <div className="bstat"><div className="bstat-label">Participantes</div><div className="bstat-value">{resumenResult.miembros}</div></div>
                </div>
              </div>
              <div className="ai-section">
                <div className="ai-section-title"><i className="ti ti-bulb"></i> Observaciones IA</div>
                {resumenResult.insights.map((insight: string, idx: number) => (
                  <div key={idx} className="ai-insight">{insight}</div>
                ))}
              </div>
              <div className="ai-section">
                <div className="ai-section-title"><i className="ti ti-users"></i> Por persona</div>
                {Object.entries(resumenResult.personas).map(([name, desc]: any) => (
                  <div key={name} className="miembro-rol"><strong>{name}</strong>: {desc}</div>
                ))}
              </div>
            </div>
          )}
          <div className="btn-row" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setIsResumenModalOpen(false)}>
              <i className="ti ti-check"></i> Listo
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ MODAL EDITAR GASTO ══════════════════════════ */}
      <div className={`modal-overlay ${isEditGastoModalOpen ? 'open' : ''}`} onClick={() => setIsEditGastoModalOpen(false)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">✏️ Editar gasto</span>
            <button className="btn-close" onClick={() => setIsEditGastoModalOpen(false)}>✕</button>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Cena en Lisboa..."
              value={editGastoDesc}
              onChange={e => setEditGastoDesc(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid2">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={editGastoMonto}
                onChange={e => setEditGastoMonto(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Divisa</label>
              <select value={editGastoDivisa} onChange={e => setEditGastoDivisa(e.target.value)}>
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
                <option value="JPY">¥ JPY</option>
                <option value="MXN">M$ MXN</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select value={editGastoCat} onChange={e => setEditGastoCat(e.target.value)}>
              <option value="comida">🍽 Comida</option>
              <option value="transporte">🚕 Transporte</option>
              <option value="alojamiento">🏨 Alojamiento</option>
              <option value="ocio">🎉 Ocio</option>
              <option value="otros">📌 Otros</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setIsEditGastoModalOpen(false)}>Cancelar</button>
            <button className="btn primary" style={{ flex: 1 }} onClick={guardarEditGasto}>✅ Guardar</button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ MODAL EDITAR GRUPO ══════════════════════════ */}
      <div className={`modal-overlay ${isEditGrupoModalOpen ? 'open' : ''}`} onClick={() => setIsEditGrupoModalOpen(false)}>
        <div className="modal-box" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 4px 14px rgba(59,109,17,0.35)' }}>
                {editGrupoEmoji || '💸'}
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{editGrupoNombre || 'Editar Grupo'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Vista previa</div>
              </div>
            </div>
            <button className="btn-close" onClick={() => setIsEditGrupoModalOpen(false)}>✕</button>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Nombre del grupo</label>
            <input
              type="text"
              placeholder="Ej: Viaje a Roma, Piso compartido..."
              value={editGrupoNombre}
              onChange={e => setEditGrupoNombre(e.target.value)}
              style={{ fontSize: '15px' }}
              autoFocus
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', marginBottom: '10px', display: 'block' }}>Elige un icono</label>
            {[
              { id: 'viajes',  label: '✈️ Viajes',         emojis: ['✈️','🌍','🏖️','🗺️','🏔️','🏕️','🚂','🚢','🛵','🏰','🗽','🌴','🎒','🧳','🌅','🏄','🎿','🚁','🌊','🏜️','🌋','🗿','🎑','⛩️'] },
              { id: 'hogar',   label: '🏠 Hogar',           emojis: ['🏠','🏡','🏢','🛋️','🛏️','🍽️','🧹','🔑','💡','🌿','🪴','🐾','👨‍👩‍👧','👨‍👩‍👦','👫','🎮','📺','🧺','🚿','🛁','🪞','🧲','🔧','🪣'] },
              { id: 'dinero',  label: '💰 Dinero',          emojis: ['💸','💰','💳','🏦','📊','💼','👔','🤝','📈','🎯','🏆','💎','🪙','💵','🧾','🤑','📋','⚡','📦','🛒','🏪','🏬','📱','💻'] },
              { id: 'ocio',    label: '🎉 Ocio',             emojis: ['🎉','🍻','🍕','🎸','🎬','🎤','⚽','🏋️','🎂','🥂','🎭','🃏','🎠','🎪','🏟️','🎡','🌮','🍣','🍜','🥗','🍔','🍷','☕','🧁'] },
              { id: 'otros',   label: '✨ Otros',            emojis: ['✨','🎓','📚','🏥','💊','🚗','🚲','⛽','🎁','💌','📸','🎨','🧩','🔮','🪄','🛡️','⚔️','🧸','🪆','🎵','🎻','🥁','🛺','🪂'] },
            ].map(cat => (
              <div key={cat.id} style={{ marginBottom: '6px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setEditEmojiCatOpen(editEmojiCatOpen === cat.id ? null : cat.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: editEmojiCatOpen === cat.id ? 'rgba(59,109,17,0.06)' : 'var(--bg3)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}
                >
                  <span>{cat.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: editEmojiCatOpen === cat.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>
                {editEmojiCatOpen === cat.id && (
                  <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
                    {cat.emojis.map(e => (
                      <button key={e} onClick={() => setEditGrupoEmoji(e)} style={{ width: '36px', height: '36px', border: editGrupoEmoji === e ? '2px solid var(--accent)' : '1.5px solid var(--border)', borderRadius: '8px', background: editGrupoEmoji === e ? 'rgba(59,109,17,0.15)' : 'var(--bg3)', fontSize: '18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn" style={{ flex: 1, padding: '11px' }} onClick={() => setIsEditGrupoModalOpen(false)}>Cancelar</button>
            <button
              className="btn primary"
              style={{ flex: 2, padding: '11px', fontSize: '15px', fontWeight: 700, opacity: editGrupoNombre.trim() ? 1 : 0.5 }}
              onClick={guardarEditGrupo}
              disabled={!editGrupoNombre.trim()}
            >
              ✅ Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
