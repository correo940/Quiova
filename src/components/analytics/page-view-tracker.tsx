'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

const EXCLUDED_EMAILS = [
  'todojuntomirar@gmail.com',
  'jacho1404@gmail.com',
];

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('q_sid');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('q_sid', id);
  }
  return id;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading) return;
    if (user?.email && EXCLUDED_EMAILS.includes(user.email)) return;

    const key = pathname + '|' + (user?.id || 'anon');
    if (tracked.current === key) return;
    tracked.current = key;

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        sessionId: getSessionId(),
      }),
    }).catch(() => {});
  }, [pathname, user, loading]);

  return null;
}
