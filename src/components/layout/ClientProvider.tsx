'use client';

import TasksProviderWrapper from '@/context/TasksProviderWrapper';
import React from 'react';
import FloatingDashboard from '@/components/dashboard/floating-dashboard';
import TaskPostIts from '@/components/dashboard/task-post-its';
import { PostItSettingsProvider } from '@/context/PostItSettingsContext';
import { JournalProvider } from '@/context/JournalContext';
import MedicineAlarmManager from '@/components/apps/mi-hogar/pharmacy/medicine-alarm-manager';
import TaskNotificationManager from '@/components/apps/mi-hogar/tasks/task-notification-manager';
import VehicleNotificationManager from '@/components/apps/mi-hogar/garage/vehicle-notification-manager';
import TextSelectionToolbar from '@/components/journal/text-selection-toolbar';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TasksProviderWrapper>
      <PostItSettingsProvider>
        <JournalProvider>
          <TextSelectionToolbar />
          <MedicineAlarmManager />
          <TaskNotificationManager />
          <VehicleNotificationManager />
          {children}
          <FloatingDashboard />
          <TaskPostIts />
        </JournalProvider>
      </PostItSettingsProvider>
    </TasksProviderWrapper>
  );
}
