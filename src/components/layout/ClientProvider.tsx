'use client';

import TasksProviderWrapper from '@/context/TasksProviderWrapper';
import React from 'react';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TasksProviderWrapper>
      {children}
    </TasksProviderWrapper>
  );
}
