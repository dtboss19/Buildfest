import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DIETARY_OPTIONS, type DietaryPreference } from '../types/database';
import './SignInModal.css';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function SignInModal({ isOpen, onClose, title = 'Sign in to contribute' }: SignInModalProps) {
  const { signIn, signUp, error, setError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>([]);

  const reset = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setDietaryPreferences([]);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleDietary = (d: DietaryPreference) => {
    setDietaryPreferences((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (!err) handleClose();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email, password, {
      displayName: displayName.trim(),
      dietaryPreferences: dietaryPreferences.length ? dietaryPreferences : undefined,
    });
    setLoading(false);
    if (!err) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="signin-modal-title">
      <div className="modal-backdrop" onClick={handleClose} aria-hidden="true" />
      <div className="modal-card signin-modal">
        <header className="modal-header">
          <h2 id="signin-modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          {error && (
            <p className="signin-error" role="alert">
              {error}
            </p>
          )}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="signin-form">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="signin-form">
              <label htmlFor="signup-display">Display name</label>
              <input
                id="signup-display"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="How others see you"
                disabled={loading}
              />
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
              />
              <fieldset className="dietary-fieldset">
                <legend>Dietary preferences (optional)</legend>
                <div className="dietary-chips">
                  {DIETARY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip ${dietaryPreferences.includes(d) ? 'chip-selected' : ''}`}
                      onClick={() => toggleDietary(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
          <p className="signin-toggle">
            {mode === 'signin' ? (
              <>
                Don’t have an account?{' '}
                <button type="button" className="link-button" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="link-button" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
