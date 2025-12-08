'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function MobileNav() {
    const pathname = usePathname();

    const handleNavClick = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            // Ignore errors (e.g. on web)
        }
    };

    const navItems = [
        {
            label: 'Inicio',
            href: '/',
            icon: Home,
        },
        {
            label: 'Apps',
            href: '/apps',
            icon: Grid,
        },
        {
            label: 'Perfil',
            href: '/profile', // Placeholder text for now
            icon: User,
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden block pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavClick}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-6 w-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
                {/* Menu Toggle Placeholder - Could be used for a drawer later */}
                <button
                    onClick={handleNavClick}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
                >
                    <Menu className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Menú</span>
                </button>
            </div>
        </div>
    );
}
