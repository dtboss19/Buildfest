export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** e.g. "3h 24m" or "45m" or "Expired" */
export function formatCountdown(expiryTime: string): { text: string; expired: boolean } {
  const end = new Date(expiryTime).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { text: 'Expired', expired: true };
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return { text, expired: false };
}
