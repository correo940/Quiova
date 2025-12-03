'use client';

import TasksProviderWrapper from '@/context/TasksProviderWrapper';
import React from 'react';
import FloatingDashboard from '@/components/dashboard/floating-dashboard';
import TaskPostIts from '@/components/dashboard/task-post-its';
import { PostItSettingsProvider } from '@/context/PostItSettingsContext';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TasksProviderWrapper>
      <PostItSettingsProvider>
        {children}
        <FloatingDashboard />
        <TaskPostIts />
      </PostItSettingsProvider>
    </TasksProviderWrapper>
  );
}
