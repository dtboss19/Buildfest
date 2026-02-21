export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const min = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${hour}${min} ${period}`;
}

export function formatSlot(open: string, close: string): string {
  return `${formatTime(open)} – ${formatTime(close)}`;
}

/** Minutes since midnight (0–1439) from "HH:mm" */
function parseToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** True if current time (minutes since midnight) falls inside any slot */
export function isOpenAtTime(
  slots: { open: string; close: string }[],
  currentMinutes: number
): boolean {
  return slots.some((s) => {
    const open = parseToMinutes(s.open);
    let close = parseToMinutes(s.close);
    if (close < open) close += 24 * 60; // overnight
    return currentMinutes >= open && currentMinutes < close;
  });
}

/** First opening time for a day (earliest open in any slot), or null */
export function getFirstOpenTime(slots: { open: string; close: string }[]): string | null {
  if (!slots.length) return null;
  const opens = slots.map((s) => s.open);
  opens.sort((a, b) => parseToMinutes(a) - parseToMinutes(b));
  return opens[0];
}
