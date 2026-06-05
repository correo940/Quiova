const PREFIX = 'quioba_notif_';

export function hasBeenShownToday(type: string, id: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return !!localStorage.getItem(`${PREFIX}${type}_${id}_${today}`);
}

export function markShownToday(type: string, id: string): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`${PREFIX}${type}_${id}_${today}`, '1');
}

// Remove entries older than 3 days to avoid localStorage bloat
export function cleanOldNotifEntries(): void {
  const now = new Date();
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(key => {
      const dateStr = key.split('_').pop() ?? '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const diffDays = (now.getTime() - new Date(dateStr).getTime()) / 86_400_000;
        if (diffDays > 3) localStorage.removeItem(key);
      }
    });
}
