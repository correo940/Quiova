'use client';

import { motion } from 'framer-motion';
import {
    Lock,
    ShoppingCart,
    BookOpen,
    CheckSquare,
    Shield,
    Home,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

const modules = [
    {
        title: 'Contraseñas',
        description: 'Gestor seguro de claves WiFi y cuentas',
        icon: Lock,
        href: '/apps/mi-hogar/passwords',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
    },
    {
        title: 'Lista de Compra',
        description: 'Gestiona productos y reposiciones',
        icon: ShoppingCart,
        href: '/apps/mi-hogar/shopping',
        color: 'text-green-500',
        bg: 'bg-green-500/10',
    },
    {
        title: 'Manuales',
        description: 'Guías y tutoriales de la casa',
        icon: BookOpen,
        href: '/apps/mi-hogar/manuals',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
    },
    {
        title: 'Tareas y Alarmas',
        description: 'Organización y recordatorios',
        icon: CheckSquare,
        href: '/apps/mi-hogar/tasks',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
    },
    {
        title: 'Seguros',
        description: 'Pólizas y vencimientos',
        icon: Shield,
        href: '/apps/mi-hogar/insurance',
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
    },
];

export default function MiHogarDashboard() {
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <Home className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Mi Hogar</h1>
                            <p className="text-muted-foreground">Centro de control doméstico inteligente</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => signOut()} title="Cerrar sesión">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module, index) => (
                        <Link key={module.title} href={module.href}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="h-full border-2 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group">
                                    <CardHeader className="pb-4">
                                        <div className={`w-12 h-12 rounded-lg ${module.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            <module.icon className={`w-6 h-6 ${module.color}`} />
                                        </div>
                                        <CardTitle className="text-xl">{module.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-base">
                                            {module.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
