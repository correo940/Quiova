'use client';

import ManualsGallery from '@/components/apps/mi-hogar/manuals/manuals-gallery';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MiHogarManualsPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto mb-6">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Mi Hogar
                    </Button>
                </Link>

            </div>
            <ManualsGallery />
        </div>
    );
}
