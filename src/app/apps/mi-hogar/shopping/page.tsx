'use client';

import ShoppingList from '@/components/apps/mi-hogar/shopping/shopping-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function MiHogarShoppingPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto mb-4">
                {/* Mobile-friendly navigation */}
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/">
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            <span className="hidden sm:inline">Inicio</span>
                        </Button>
                    </Link>
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Mi Hogar
                        </Button>
                    </Link>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">Lista de la Compra</h1>
                <p className="text-muted-foreground text-sm">Gestiona tus compras y reposiciones.</p>
            </div>
            <ShoppingList />
        </div>
    );
}
