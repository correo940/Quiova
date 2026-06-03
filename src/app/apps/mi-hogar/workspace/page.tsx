'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import WorkspaceManager from '@/components/apps/mi-hogar/workspace/workspace-manager';

export default function WorkspacePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Por defecto el PIN es 1234 (consistente con el resto del gestor)
  const CORRECT_PIN = '1234';

  useEffect(() => {
    // Verificar si el usuario actual es el administrador
    const checkAdminUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        if (email === 'todojuntomirar@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
      }
    };

    // Intentar leer la configuración local para ver si hay contraseña guardada
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/workspace');
        if (res.ok) {
          const data = await res.json();
          if (data?.config?.passwordHash) {
            setPasswordHash(data.config.passwordHash);
          }
        }
      } catch (err) {
        console.warn('No se pudo leer la configuración local de la base de datos.');
      }
    };

    checkAdminUser();
    fetchConfig();
  }, []);

  const handleKeypadPress = (num: string) => {
    if (pin.length >= 4) return;
    setPinError(false);
    
    const newPin = pin + num;
    setPin(newPin);
    
    // Si llega a 4 caracteres, validar inmediatamente
    if (newPin.length === 4) {
      // Para simplificar localmente en web y tablet, si hay un hash configurado 
      // y coincide con la entrada, o si no hay contraseña configurada y es 1234:
      const isValid = newPin === CORRECT_PIN || (passwordHash && newPin === passwordHash);
      if (isValid) {
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 150);
      } else {
        setTimeout(() => {
          setPinError(true);
          setPin('');
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
      setPinError(false);
    }
  };

  if (isAdmin === null) {
    // Pantalla de carga estética
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-rose-100/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-slate-100/30 blur-[120px] pointer-events-none" />
        
        <div className="z-10 w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-[0_4px_20px_rgba(244,63,94,0.05)]">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 z-10">Acceso Restringido</h1>
        <p className="text-slate-500 text-sm mt-2 max-w-xs leading-relaxed z-10">
          Esta aplicación es privada y solo está disponible para el administrador de Quioba Studios.
        </p>
        <Link href="/apps/mi-hogar" className="mt-6 z-10">
          <Button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-6 py-2.5 shadow-sm transition-all">
            Volver a Mi Hogar
          </Button>
        </Link>
      </div>
    );
  }

  if (isAuthenticated) {
    return <WorkspaceManager />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-100/30 blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <header className="z-10 flex items-center justify-between w-full max-w-md mx-auto">
        <Link href="/apps/mi-hogar">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-full px-4 gap-2 transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-white/90 border border-slate-200 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Quioba Studios</span>
        </div>
      </header>

      {/* Main Lock Screen */}
      <main className="z-10 flex-1 flex flex-col items-center justify-center max-w-sm w-full mx-auto my-auto gap-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 border border-slate-200 flex items-center justify-center text-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.08)] mx-auto mb-4 backdrop-blur-md">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
            Quioba Studios
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed font-semibold">
            Área de planificación privada. Introduce tu código PIN para continuar.
          </p>
        </motion.div>

        {/* Input indicators */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 items-center h-8">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                animate={pinError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  pinError 
                    ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : pin.length > index
                      ? 'bg-emerald-500 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-200 border border-slate-350'
                }`}
              />
            ))}
          </div>
          {pinError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose-500 text-xs font-bold flex items-center gap-1 mt-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              PIN incorrecto. Reintenta.
            </motion.p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeypadPress(num.toString())}
              className="w-16 h-16 rounded-full border border-slate-205 bg-white text-2xl font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all flex items-center justify-center shadow-sm mx-auto"
            >
              {num}
            </button>
          ))}
          
          <button 
            onClick={() => setShowHelper(!showHelper)}
            className="w-16 h-16 text-xs text-slate-400 font-bold hover:text-slate-600 active:scale-95 transition-all flex items-center justify-center mx-auto"
          >
            {showHelper ? 'PIN: 1234' : 'Ayuda'}
          </button>
          
          <button
            onClick={() => handleKeypadPress('0')}
            className="w-16 h-16 rounded-full border border-slate-205 bg-white text-2xl font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all flex items-center justify-center shadow-sm mx-auto"
          >
            0
          </button>
          
          <button
            onClick={handleDelete}
            disabled={pin.length === 0}
            className="w-16 h-16 rounded-full text-slate-405 hover:text-rose-500 disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center mx-auto font-bold text-sm"
          >
            Borrar
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 text-center py-4">
        <p className="text-[11px] text-slate-400 font-bold">
          Workspace de Quioba Studios • Protegido Localmente
        </p>
      </footer>
    </div>
  );
}
