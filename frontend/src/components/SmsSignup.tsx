import { useState } from 'react';

const SMS_API_URL = import.meta.env.VITE_SMS_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits.replace(/(\d{0,3})/, (_, g) => (g ? `(${g}` : ''));
  if (digits.length <= 6) return digits.replace(/(\d{3})(\d{0,3})/, '($1) $2');
  return digits.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3').slice(0, 14);
}

export function SmsSignup() {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
        body: JSON.stringify({ phone: `+1${digits}` }),
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

  const isConfigured = Boolean(SMS_API_URL);

  return (
    <section className="sms-signup" aria-labelledby="sms-signup-title">
      <h2 id="sms-signup-title">Get SMS alerts</h2>
      <p className="sms-signup-desc">
        Get a daily text with the closest food shelves open that day. You can unsubscribe anytime.
      </p>
      {!isConfigured && (
        <p className="sms-signup-demo">SMS alerts are a key feature — connect the backend to enable live signups.</p>
      )}
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
          disabled={status === 'loading' || !isConfigured}
          autoComplete="tel"
        />
        <button type="submit" className="btn-sms-submit" disabled={status === 'loading' || !isConfigured}>
          {status === 'loading' ? 'Subscribing…' : !isConfigured ? 'Coming soon' : 'Subscribe'}
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
