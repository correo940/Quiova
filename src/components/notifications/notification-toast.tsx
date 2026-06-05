'use client';

import React from 'react';
import { toast } from 'sonner';

interface NotificationToastProps {
  toastId: string | number;
  icon: string;
  title: string;
  subtitle: string;
  missed?: boolean;
  scheduledTime?: string;
  onGo: () => void;
}

export function NotificationToast({
  toastId,
  icon,
  title,
  subtitle,
  missed = false,
  scheduledTime,
  onGo,
}: NotificationToastProps) {
  return (
    <div
      className={`
        flex items-center gap-3 rounded-2xl shadow-xl border p-3.5
        bg-white dark:bg-zinc-900
        ${missed
          ? 'border-orange-200 dark:border-orange-800/50'
          : 'border-zinc-200 dark:border-zinc-700/60'
        }
        w-[340px] cursor-pointer
      `}
      onClick={onGo}
      role="button"
    >
      {/* Icon bubble */}
      <div className={`
        flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl select-none
        ${missed
          ? 'bg-orange-50 dark:bg-orange-900/30'
          : 'bg-blue-50 dark:bg-blue-900/30'
        }
      `}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {title}
          </p>
          {missed && (
            <span className="flex-shrink-0 text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Pasó
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
          {subtitle}
        </p>
        {missed && scheduledTime && (
          <p className="text-[11px] text-orange-500 dark:text-orange-400 mt-1 font-medium">
            Programado a las {scheduledTime}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onGo(); }}
          className="text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          Ver
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-3 py-1 transition-colors text-center"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function showNotificationToast(params: {
  icon: string;
  title: string;
  subtitle: string;
  missed?: boolean;
  scheduledTime?: string;
  onGo: () => void;
  duration?: number;
}) {
  toast.custom(
    (t) => (
      <NotificationToast
        toastId={t}
        icon={params.icon}
        title={params.title}
        subtitle={params.subtitle}
        missed={params.missed}
        scheduledTime={params.scheduledTime}
        onGo={() => { params.onGo(); toast.dismiss(t); }}
      />
    ),
    { duration: params.duration ?? 14000 }
  );
}
