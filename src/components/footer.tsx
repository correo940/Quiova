'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  category: 'cuerpo' | 'mente' | 'finanzas' | 'general';
  initials: string;
  avatarBg: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "María Gómez",
    role: "Madre de familia",
    text: "Quioba me ha ayudado a organizar mejor las finanzas de casa y a encontrar tiempo para mi bienestar mental. Es justo lo que necesitaba.",
    rating: 5,
    category: "mente",
    initials: "MG",
    avatarBg: "from-blue-500 to-indigo-600"
  },
  {
    name: "Carlos Ruiz",
    role: "Emprendedor",
    text: "La sección de salud física y las herramientas de hábitos han cambiado mi rutina diaria. Una plataforma muy completa y fácil de usar.",
    rating: 5,
    category: "cuerpo",
    initials: "CR",
    avatarBg: "from-emerald-500 to-teal-600"
  },
  {
    name: "Laura Martínez",
    role: "Estudiante",
    text: "Increíble cómo integran cuerpo, mente y finanzas. Me siento mucho más equilibrada desde que uso Quioba.",
    rating: 5,
    category: "general",
    initials: "LM",
    avatarBg: "from-purple-500 to-pink-600"
  },
  {
    name: "Alejandro Sanz",
    role: "Deportista amateur",
    text: "Gracias a las rutinas de Quioba Cuerpo he vuelto a entrenar de forma constante sin lesionarme. Los planes de nutrición son oro puro.",
    rating: 5,
    category: "cuerpo",
    initials: "AS",
    avatarBg: "from-green-400 to-emerald-600"
  },
  {
    name: "Sofía Vega",
    role: "Profesora de Secundaria",
    text: "La sección de meditación y respiración guiada me salva después de un día intenso en las aulas. Mis niveles de estrés han bajado drásticamente.",
    rating: 5,
    category: "mente",
    initials: "SV",
    avatarBg: "from-cyan-500 to-blue-600"
  },
  {
    name: "David Ortiz",
    role: "Consultor de Negocios",
    text: "Organizar el presupuesto mensual con Quioba Finanzas me ha permitido planificar el futuro de mi familia con total claridad y tranquilidad.",
    rating: 5,
    category: "finanzas",
    initials: "DO",
    avatarBg: "from-amber-500 to-orange-600"
  },
  {
    name: "Elena Rius",
    role: "Jubilada",
    text: "A mis 65 años, los ejercicios adaptados de bajo impacto y los retos de hábitos diarios me ayudan a sentirme activa y llena de energía. ¡Maravilloso!",
    rating: 5,
    category: "cuerpo",
    initials: "ER",
    avatarBg: "from-teal-400 to-green-600"
  },
  {
    name: "Javier L.",
    role: "Profesional tecnológico",
    text: "Controlar los pequeños gastos del día a día me ha abierto los ojos. He conseguido ahorrar una cantidad significativa al mes casi sin esfuerzo.",
    rating: 5,
    category: "finanzas",
    initials: "JL",
    avatarBg: "from-yellow-500 to-amber-600"
  },
  {
    name: "Dra. Carmen D.",
    role: "Psicóloga",
    text: "Recomiendo estas herramientas de bienestar mental a mis pacientes. El enfoque integral es clave para un autocuidado diario sostenible y efectivo.",
    rating: 5,
    category: "mente",
    initials: "CD",
    avatarBg: "from-indigo-400 to-violet-600"
  },
  {
    name: "Roberto S.",
    role: "Diseñador freelance",
    text: "Gestionar salud y finanzas en un solo lugar me ahorra tiempo y energía. La interfaz es intuitiva y el diseño hace que todo sea un placer de usar.",
    rating: 5,
    category: "general",
    initials: "RS",
    avatarBg: "from-fuchsia-500 to-purple-600"
  },
  {
    name: "Marta F.",
    role: "Gestora de contenidos",
    text: "Los recordatorios de hidratación y las pausas activas me ayudan a llegar al final del día con energía. Ideal para quienes trabajan muchas horas frente a la pantalla.",
    rating: 5,
    category: "cuerpo",
    initials: "MF",
    avatarBg: "from-emerald-400 to-cyan-600"
  },
  {
    name: "Pablo C.",
    role: "Ingeniero",
    text: "El diario guiado y las herramientas de enfoque me han ayudado a priorizar lo que realmente importa y a alcanzar mis metas personales paso a paso.",
    rating: 5,
    category: "mente",
    initials: "PC",
    avatarBg: "from-sky-500 to-indigo-600"
  }
];

const CATEGORY_CONFIG = {
  cuerpo: { label: 'Cuerpo', textColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
  mente: { label: 'Mente', textColor: 'text-blue-400 bg-blue-950/40 border-blue-500/30' },
  finanzas: { label: 'Finanzas', textColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
  general: { label: 'General', textColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30' },
};

const hoverBorderClasses = {
  cuerpo: 'hover:border-emerald-500/50',
  mente: 'hover:border-blue-500/50',
  finanzas: 'hover:border-amber-500/50',
  general: 'hover:border-purple-500/50',
};

const textHoverClasses = {
  cuerpo: 'group-hover:text-emerald-400',
  mente: 'group-hover:text-blue-400',
  finanzas: 'group-hover:text-amber-400',
  general: 'group-hover:text-purple-400',
};

export default function Footer() {
  const row1 = TESTIMONIALS.slice(0, 6);
  const row2 = TESTIMONIALS.slice(6, 12);

  return (
    <footer className="w-full bg-[#0b3c21] text-white pt-20 pb-10 overflow-hidden">
      <style>{`
        @keyframes marqueeLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marqueeLeft 50s linear infinite;
        }
        .animate-marquee-right {
          animation: marqueeRight 50s linear infinite;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* TESTIMONIALS SECTION */}
      <div className="mb-24 w-full">
        <div className="max-w-6xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Lo que dicen de nosotros</h2>
          <p className="text-white/60">Únete a la comunidad que ya está transformando su vida.</p>
        </div>
        
        <div className="relative w-full flex flex-col gap-6 select-none pointer-events-auto">
          {/* Gradient overlays to hide edges */}
          <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-[#0b3c21] via-[#0b3c21]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-[#0b3c21] via-[#0b3c21]/80 to-transparent z-10 pointer-events-none" />

          {/* Row 1: Left to Right */}
          <div className="flex w-max gap-6 animate-marquee-right">
            <div className="flex gap-6 shrink-0">
              {row1.map((t) => (
                <div
                  key={t.name}
                  className={`w-[280px] md:w-[340px] shrink-0 bg-white/5 border border-white/10 ${hoverBorderClasses[t.category]} rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between h-[210px] group`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(t.rating)].map((_, i) => (
                          <span key={i} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${CATEGORY_CONFIG[t.category].textColor}`}>
                        {CATEGORY_CONFIG[t.category].label}
                      </span>
                    </div>
                    <p className="text-white/85 italic text-sm line-clamp-3 leading-relaxed">"{t.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-white font-black text-sm shadow-inner border border-white/10 shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className={`font-bold text-white text-sm ${textHoverClasses[t.category]} transition-colors`}>{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 shrink-0" aria-hidden="true">
              {row1.map((t) => (
                <div
                  key={`${t.name}-dup`}
                  className={`w-[280px] md:w-[340px] shrink-0 bg-white/5 border border-white/10 ${hoverBorderClasses[t.category]} rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between h-[210px] group`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(t.rating)].map((_, i) => (
                          <span key={i} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${CATEGORY_CONFIG[t.category].textColor}`}>
                        {CATEGORY_CONFIG[t.category].label}
                      </span>
                    </div>
                    <p className="text-white/85 italic text-sm line-clamp-3 leading-relaxed">"{t.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-white font-black text-sm shadow-inner border border-white/10 shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className={`font-bold text-white text-sm ${textHoverClasses[t.category]} transition-colors`}>{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Right to Left */}
          <div className="flex w-max gap-6 animate-marquee-left">
            <div className="flex gap-6 shrink-0">
              {row2.map((t) => (
                <div
                  key={t.name}
                  className={`w-[280px] md:w-[340px] shrink-0 bg-white/5 border border-white/10 ${hoverBorderClasses[t.category]} rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between h-[210px] group`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(t.rating)].map((_, i) => (
                          <span key={i} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${CATEGORY_CONFIG[t.category].textColor}`}>
                        {CATEGORY_CONFIG[t.category].label}
                      </span>
                    </div>
                    <p className="text-white/85 italic text-sm line-clamp-3 leading-relaxed">"{t.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-white font-black text-sm shadow-inner border border-white/10 shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className={`font-bold text-white text-sm ${textHoverClasses[t.category]} transition-colors`}>{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 shrink-0" aria-hidden="true">
              {row2.map((t) => (
                <div
                  key={`${t.name}-dup`}
                  className={`w-[280px] md:w-[340px] shrink-0 bg-white/5 border border-white/10 ${hoverBorderClasses[t.category]} rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between h-[210px] group`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(t.rating)].map((_, i) => (
                          <span key={i} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${CATEGORY_CONFIG[t.category].textColor}`}>
                        {CATEGORY_CONFIG[t.category].label}
                      </span>
                    </div>
                    <p className="text-white/85 italic text-sm line-clamp-3 leading-relaxed">"{t.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-white font-black text-sm shadow-inner border border-white/10 shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className={`font-bold text-white text-sm ${textHoverClasses[t.category]} transition-colors`}>{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* FOOTER LINKS & INFO */}
        <div className="border-t border-white/10 pt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
                  <Image src="/images/logo.png" alt="Quioba" width={24} height={24} className="object-contain" />
               </div>
               <span className="text-2xl font-black tracking-tight">Quioba</span>
            </div>
            <p className="text-white/50 text-sm max-w-xs">
              Tu espacio integral para mejorar tu cuerpo, tu mente y tus finanzas sin complicaciones.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white/90 uppercase text-xs tracking-wider mb-2">Compañía</h4>
              <Link href="/quienes-somos" className="text-white/60 hover:text-white transition-colors text-sm">Quiénes somos</Link>
              <Link href="/contacto" className="text-white/60 hover:text-white transition-colors text-sm">Contacto</Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white/90 uppercase text-xs tracking-wider mb-2">Legal</h4>
              <Link href="/cookies" className="text-white/60 hover:text-white transition-colors text-sm">Política de Cookies</Link>
              <Link href="/privacidad" className="text-white/60 hover:text-white transition-colors text-sm">Privacidad</Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white/90 uppercase text-xs tracking-wider mb-2">Síguenos</h4>
              <div className="flex gap-4">
                <a href="#" className="text-white/60 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-white/60 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/40 text-xs">
          <p>&copy; {new Date().getFullYear()} Quioba. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
