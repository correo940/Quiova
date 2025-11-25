'use client';

import ShoppingList from '@/components/apps/mi-hogar/shopping/shopping-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MiHogarShoppingPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto mb-6">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Mi Hogar
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold mt-4">Lista de la Compra</h1>
                <p className="text-muted-foreground">Gestiona tus compras y reposiciones de despensa.</p>
            </div>
            <ShoppingList />
        </div>
    );
}
