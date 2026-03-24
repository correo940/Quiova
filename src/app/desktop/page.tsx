'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoLoader from '@/components/ui/logo-loader';
import { useGlobalMenu } from '@/context/GlobalMenuContext';

export default function DesktopEntryPage() {
  const router = useRouter();
  const { setIsLauncherMode } = useGlobalMenu();

  useEffect(() => {
    setIsLauncherMode(false);
    router.replace('/');
  }, [router, setIsLauncherMode]);

  return (
    <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <LogoLoader size="lg" />
      <p className="text-xl font-medium text-slate-600 animate-pulse">
        Abriendo dashboard...
      </p>
    </div>
  );
}
