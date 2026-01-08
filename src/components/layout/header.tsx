'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Search } from 'lucide-react';
import { Logo } from '../logo';
import { categories } from '@/lib/data';
import CategoryIcon from '../category-icon';
import HeaderAuth from './header-auth';

const navLinks = [
  { href: '#latest-articles', label: 'Artículos' },
  { href: '/about', label: 'Sobre nosotros' },
  { href: '/contact', label: 'Contacto' },
];

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}#latest-articles`);
    } else {
      router.push('/');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center" suppressHydrationWarning>
        <div className="mr-4 hidden md:flex" suppressHydrationWarning>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-7 w-auto" />
            <span className="font-bold text-lg">Quioba</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Nav */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <Link href="/" className="mb-8 flex items-center space-x-2">
              <Logo className="h-7 w-auto" />
              <span className="font-bold text-lg">Quioba</span>
            </Link>
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t">
                <p className="font-medium mb-2">Categorías</p>
                {categories.map((category) => (
                  <Link key={category} href={`/category/${category}`} className="flex items-center capitalize p-2 rounded-md hover:bg-accent">
                    <CategoryIcon category={category} className="mr-2 h-4 w-4" />
                    {category.replace('physical health', 'salud física').replace('mental health', 'salud mental').replace('family finance', 'finanzas familiares')}
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end" suppressHydrationWarning>
          <div className="w-full flex-1 md:w-auto md:flex-none" suppressHydrationWarning>
            <div className="relative" suppressHydrationWarning>
              <button onClick={handleSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-primary transition-colors">
                <Search className="h-4 w-4" />
              </button>
              <Input
                type="search"
                placeholder="Buscar artículos..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
