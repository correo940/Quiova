'use client';

import Link from 'next/link';
import { Logo } from '../logo';
import { Github, Twitter, Instagram } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Logo className="h-7 w-auto" />
            <span className="font-bold text-lg">Quiova</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentYear !== null ? (
              `© ${currentYear} Quiova. Todos los derechos reservados.`
            ) : (
              'Cargando...'
            )}
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Link href="#" aria-label="Twitter">
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="#" aria-label="GitHub">
              <Github className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="#" aria-label="Instagram">
              <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
