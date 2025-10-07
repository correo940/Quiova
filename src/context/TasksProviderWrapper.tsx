'use client';

import { TasksProvider } from '@/context/TasksContext';
import { useState, useEffect } from 'react';

export default function TasksProviderWrapper({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="flex-grow flex items-center justify-center">Cargando aplicación...</div>;
  }

  return (
    <TasksProvider>
      {children}
    </TasksProvider>
  );
}
