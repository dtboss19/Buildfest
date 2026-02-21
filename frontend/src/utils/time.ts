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
