import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Artículos · Próximamente — Quioba',
    description: 'Contenido en profundidad sobre cuerpo, mente y finanzas. Muy pronto disponible.',
};

export default function ArticlesPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center"
            style={{ background: 'linear-gradient(160deg, #edf7f1 0%, #ffffff 60%, #f0f4ff 100%)' }}>

            <div className="text-6xl mb-6">📖</div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
                Artículos
                <span className="block mt-1" style={{ color: '#1a5c2e' }}>Próximamente</span>
            </h1>

            <p className="text-slate-500 text-lg max-w-md mb-10 leading-relaxed">
                Estamos preparando contenido en profundidad sobre cuerpo, mente y finanzas.
                Sé el primero en leerlo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/beta"
                    className="inline-flex items-center justify-center gap-2 text-white font-bold px-7 py-3.5 rounded-2xl text-base transition-all"
                    style={{
                        background: 'linear-gradient(135deg, #1a5c2e 0%, #1e7a3a 100%)',
                        boxShadow: '0 8px 20px rgba(26,92,46,0.25)',
                    }}>
                    🚀 Apuntarme a la Beta
                </Link>
                <Link href="/"
                    className="inline-flex items-center justify-center gap-2 border bg-white font-semibold px-7 py-3.5 rounded-2xl text-base transition-all"
                    style={{ borderColor: '#b0d9bc', color: '#1a5c2e' }}>
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    );
}
