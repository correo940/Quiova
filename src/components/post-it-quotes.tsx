'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const allQuotes = [
    {
        text: "Que tu medicina sea tu alimento, y el alimento tu medicina.",
        author: "Hipócrates",
        color: "bg-yellow-200",
    },
    {
        text: "Cuida de los pequeños gastos; un pequeño agujero hunde un barco.",
        author: "Benjamin Franklin",
        color: "bg-blue-200",
    },
    {
        text: "Comer es una necesidad, pero comer de forma inteligente es un arte.",
        author: "La Rochefoucauld",
        color: "bg-green-200",
    },
    {
        text: "No ahorres lo que te queda después de gastar, gasta lo que te queda después de ahorrar.",
        author: "Warren Buffett",
        color: "bg-pink-200",
    },
    {
        text: "La primera riqueza es la salud.",
        author: "Ralph Waldo Emerson",
        color: "bg-orange-200",
    },
    {
        text: "El precio es lo que pagas. El valor es lo que obtienes.",
        author: "Warren Buffett",
        color: "bg-purple-200",
    },
    {
        text: "Invierte en ti mismo. Es la mejor inversión que harás.",
        author: "Anónimo",
        color: "bg-yellow-100",
    },
    {
        text: "Desayuna como un rey, almuerza como un príncipe y cena como un mendigo.",
        author: "Refrán popular",
        color: "bg-teal-200",
    }
];

export default function PostItQuotes() {
    const [displayedQuotes, setDisplayedQuotes] = useState(allQuotes.slice(0, 4));

    useEffect(() => {
        const interval = setInterval(() => {
            setDisplayedQuotes((current) => {
                const newQuotes = [...current];
                // Elegir una posición aleatoria para cambiar (0-3)
                const replaceIndex = Math.floor(Math.random() * 4);

                // Elegir una frase nueva que no esté mostrándose actualmente
                const currentTexts = newQuotes.map(q => q.text);
                const availableQuotes = allQuotes.filter(q => !currentTexts.includes(q.text));

                if (availableQuotes.length > 0) {
                    const randomQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
                    newQuotes[replaceIndex] = randomQuote;
                }

                return newQuotes;
            });
        }, 4000); // Cambiar cada 4 segundos

        return () => clearInterval(interval);
    }, []);

    // Generar rotaciones aleatorias estables para las posiciones
    const rotations = ["rotate-2", "-rotate-3", "rotate-1", "-rotate-2"];

    return (
        <section className="py-16 bg-slate-200 relative overflow-hidden">
            {/* Textura de nevera (sutil ruido o gradiente metálico) */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]"></div>

            <div className="container mx-auto px-4 relative z-10">
                <h2 className="font-headline text-3xl font-bold mb-12 text-center text-slate-700 drop-shadow-sm">
                    La Nevera de la Sabiduría
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 min-h-[250px]">
                    {displayedQuotes.map((quote, index) => (
                        <div key={index} className="relative h-full flex justify-center items-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={quote.text} // Clave única para forzar la animación al cambiar
                                    initial={{ opacity: 0, scale: 0.8, rotate: Math.random() * 10 - 5 }}
                                    animate={{ opacity: 1, scale: 1, rotate: Math.random() * 6 - 3 }} // Rotación aleatoria viva
                                    exit={{ opacity: 0, scale: 1.1, rotate: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className={`relative p-6 ${quote.color} shadow-xl w-full max-w-[280px] aspect-square flex flex-col justify-between font-handwriting`}
                                    style={{
                                        boxShadow: '10px 10px 20px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    {/* Imán de nevera */}
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black shadow-md border-2 border-gray-600 z-20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-gray-400 opacity-50"></div>
                                    </div>

                                    <p className="text-xl text-slate-800 font-medium leading-relaxed font-sans text-center mt-4">
                                        "{quote.text}"
                                    </p>
                                    <p className="text-right text-slate-700 text-sm font-bold italic font-sans mt-2">
                                        — {quote.author}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
