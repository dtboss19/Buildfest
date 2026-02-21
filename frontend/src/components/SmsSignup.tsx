import { useState } from 'react';

// Use main backend (Railway) for SMS when merged; or legacy VITE_SMS_API_URL if set
const rawSms = (import.meta.env.VITE_SMS_API_URL ?? import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')).toString().trim().replace(/\/$/, '') || '';
const SMS_API_URL = rawSms && !/^https?:\/\//i.test(rawSms) ? `https://${rawSms}` : rawSms;

const NOTIFICATION_OPTIONS = [
  { key: 'daily_digest' as const, label: 'Daily open shelves', description: 'A text each morning with the closest food shelves open that day.' },
  { key: 'surplus_drops' as const, label: 'Food drops at my shelter', description: 'When food is donated or dropped at my nearest food shelf (e.g. from a company).' },
  { key: 'surplus_posts' as const, label: 'Surplus food posts nearby', description: 'When someone posts free surplus food to rescue in my area.' },
];

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits.replace(/(\d{0,3})/, (_, g) => (g ? `(${g}` : ''));
  if (digits.length <= 6) return digits.replace(/(\d{3})(\d{0,3})/, '($1) $2');
  return digits.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3').slice(0, 14);
}

export function SmsSignup() {
  const [phone, setPhone] = useState('');
  const [prefs, setPrefs] = useState({ daily_digest: true, surplus_drops: false, surplus_posts: false });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const togglePref = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SMS_API_URL) {
      setStatus('error');
      setMessage('SMS signup will be available when the backend is connected.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setStatus('error');
      setMessage('Enter a valid 10-digit phone number.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${SMS_API_URL.replace(/\/$/, '')}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+1${digits}`, ...prefs }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus('success');
        setMessage(data.message ?? 'You’re signed up. Check your phone for a confirmation text.');
        setPhone('');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Signup failed. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Try again later.');
    }
  };

  return (
    <section className="sms-signup" aria-labelledby="sms-signup-title">
      <h2 id="sms-signup-title">Get SMS alerts</h2>
      <p className="sms-signup-desc">
        Choose what you want to be notified about. You can unsubscribe anytime.
      </p>
      <div className="sms-toggles" role="group" aria-label="Notification preferences">
        {NOTIFICATION_OPTIONS.map(({ key, label, description }) => (
          <label key={key} className="sms-toggle-row">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => togglePref(key)}
              className="sms-toggle-input"
              disabled={status === 'loading'}
            />
            <span className="sms-toggle-text">
              <strong>{label}</strong> — {description}
            </span>
          </label>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="sms-signup-form">
        <label htmlFor="sms-phone" className="sr-only">Phone number</label>
        <input
          id="sms-phone"
          type="tel"
          inputMode="numeric"
          placeholder="(651) 555-1234"
          value={phone}
          onChange={(e) => setPhone(normalizePhone(e.target.value))}
          className="sms-input"
          disabled={status === 'loading'}
          autoComplete="tel"
        />
        <button type="submit" className="btn-sms-submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p className={`sms-status ${status === 'success' ? 'sms-status-success' : 'sms-status-error'}`} role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
