import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import type { UserProfile } from '../types/database';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, meta: { displayName: string; dietaryPreferences?: string[] }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureMyProfile: () => Promise<UserProfile | null>;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TIMEOUT_MS = 12_000;

function isAuthLockError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('lockmanager') ||
    m.includes('auth-token') ||
    m.includes('timed out') ||
    m.includes('navigatorlockacquiretimeouterror')
  );
}

function formatAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('email rate limit exceeded')) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (m.includes('invalid login')) return 'Invalid email or password.';
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data as UserProfile;
  }, []);

  const ensureProfileExists = useCallback(async (user: User): Promise<UserProfile | null> => {
    let profile = await fetchProfile(user.id);
    if (profile) return profile;
    const isAnonymous = user.is_anonymous === true;
    const displayName =
      (user.user_metadata?.display_name as string)?.trim() ||
      (isAnonymous ? 'Anonymous' : (user.email ? user.email.split('@')[0] : 'User')) ||
      'User';
    const { error: insertErr } = await supabase.from('user_profiles').insert({
      user_id: user.id,
      display_name: displayName,
    });
    if (insertErr && insertErr.code !== '23505') return null;
    return fetchProfile(user.id);
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    try {
      const currentUser = userRef.current;
      if (currentUser) {
        const profile = await ensureProfileExists(currentUser);
        setState((s) => (s.user?.id === currentUser.id ? { ...s, profile: profile ?? null } : s));
        return;
      }
      const { data: { user }, error } = await supabase.auth.getUser();
      const isLockError = error?.message && isAuthLockError(error.message);
      if (isLockError || !user) {
        if (isLockError && userRef.current) {
          ensureProfileExists(userRef.current).then((profile) => {
            setState((prev) => (prev.user ? { ...prev, profile: profile ?? null } : prev));
          }).catch(() => {});
        } else if (!user) {
          setState((s) => ({ ...s, profile: null }));
        }
        return;
      }
      const profile = await ensureProfileExists(user);
      setState((s) => ({ ...s, profile: profile ?? null }));
    } catch {
      setState((s) => (s.user ? s : { ...s, profile: null }));
    }
  }, [ensureProfileExists]);

  const ensureMyProfile = useCallback(async (): Promise<UserProfile | null> => {
    const currentUser = userRef.current;
    if (!currentUser) return null;
    const profile = await ensureProfileExists(currentUser);
    setState((s) => (s.user?.id === currentUser.id ? { ...s, profile: profile ?? null } : s));
    return profile;
  }, [ensureProfileExists]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setState((s) => (s.loading ? { ...s, user: null, profile: null, loading: false, error: null } : s));
      return;
    }

    let mounted = true;

    const init = async (retry = false) => {
      // #region agent log
      const t0 = Date.now();
      fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:init', message: 'init_start', data: { retry, ts: t0 }, hypothesisId: 'H1', timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      try {
        // Single auth call to avoid lock contention: getSession + signInAnonymously both acquire the same lock and can timeout.
        const anonResult = await Promise.race([
          supabase.auth.signInAnonymously(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), AUTH_TIMEOUT_MS)
          ),
        ]);
        const anonData = anonResult.data;
        const anonErr = anonResult.error;
        // #region agent log
        fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:after_signInAnonymously', message: 'after_signInAnonymously', data: { ok: !anonErr && !!anonData?.session?.user, err: anonErr?.message ?? null, elapsed: Date.now() - t0 }, hypothesisId: 'H2', timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        if (!mounted) return;
        const session = anonData?.session;
        if (anonErr || !session?.user) {
          setState({ user: null, profile: null, loading: false, error: null });
          return;
        }
        // Set user and loading:false immediately so UI is responsive; load profile in background.
        setState({ user: session.user, profile: null, loading: false, error: null });
        // #region agent log
        fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:before_ensureProfile', message: 'before_ensureProfile', data: { elapsed: Date.now() - t0 }, hypothesisId: 'H4', timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        ensureProfileExists(session.user).then((profile) => {
          if (!mounted) return;
          setState((s) => (s.user?.id === session.user.id ? { ...s, profile: profile ?? null } : s));
          // #region agent log
          fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:init_done', message: 'init_done', data: { hasProfile: !!profile, totalElapsed: Date.now() - t0 }, hypothesisId: 'H4', timestamp: Date.now() }) }).catch(() => {});
          // #endregion
        }).catch(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // #region agent log
        fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:init_catch', message: 'init_catch', data: { msg: msg.slice(0, 120), isLockOrTimeout: isAuthLockError(msg) || msg === 'timeout', retry }, hypothesisId: 'H1', timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        if (!mounted) return;
        // Always stop loading so the app never stays stuck; retry in background if lock/timeout.
        setState((s) => (s.loading ? { ...s, user: null, profile: null, loading: false, error: null } : s));
        const isLockOrTimeout = isAuthLockError(msg) || msg === 'timeout';
        if (isLockOrTimeout && !retry) {
          setTimeout(() => init(true), 2000);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // #region agent log
      fetch('http://127.0.0.1:7805/ingest/31f8c09b-0f5d-4b67-a668-61f689c5aeb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e731f4' }, body: JSON.stringify({ sessionId: 'e731f4', location: 'AuthContext.tsx:onAuthStateChange', message: 'onAuthStateChange', data: { event, hasSession: !!session }, hypothesisId: 'H3', timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        if (!mounted) return;
        if (anonData?.session?.user) {
          const profile = await ensureProfileExists(anonData.session.user);
          setState({ user: anonData.session.user, profile: profile ?? null, loading: false, error: null });
        } else {
          setState({ user: null, profile: null, loading: false, error: null });
        }
        return;
      }
      try {
        const profile = await ensureProfileExists(session.user);
        if (!mounted) return;
        setState({ user: session.user, profile, loading: false, error: null });
      } catch {
        if (mounted) setState({ user: session.user, profile: null, loading: false, error: null });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfileExists]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    setState((s) => ({ ...s, error: null }));
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Try again.')), AUTH_TIMEOUT_MS)
        ),
      ]);
      const { data, error } = result;
      if (error) {
        const msg = formatAuthError(error.message);
        setState((s) => ({ ...s, error: msg }));
        return { error: msg };
      }
      if (data?.user) {
        const profile = await ensureProfileExists(data.user).catch(() => null);
        setState({ user: data.user, profile, loading: false, error: null });
      }
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Try again.';
      setState((s) => ({ ...s, error: msg }));
      return { error: msg };
    }
  }, [ensureProfileExists]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta: { displayName: string; dietaryPreferences?: string[] }
    ): Promise<{ error: string | null }> => {
      setState((s) => ({ ...s, error: null }));
      try {
        const result = await Promise.race([
          (async () => {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  display_name: meta.displayName,
                  dietary_preferences: meta.dietaryPreferences ?? [],
                },
              },
            });
            if (error) return { data: null, error };
            if (data.user) {
              await supabase.from('user_profiles').update({
                display_name: meta.displayName,
                dietary_preferences: meta.dietaryPreferences ?? [],
              }).eq('user_id', data.user.id);
            }
            return { data, error: null };
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timed out. Try again.')), AUTH_TIMEOUT_MS)
          ),
        ]);
        const { data, error } = result;
        if (error) {
          const msg = formatAuthError(error.message);
          setState((s) => ({ ...s, error: msg }));
          return { error: msg };
        }
        if (data?.user) {
          const profile = await ensureProfileExists(data.user).catch(() => null);
          setState((prev) => ({
            user: data.user,
            profile: profile ?? (prev.profile ? { ...prev.profile, display_name: meta.displayName, dietary_preferences: meta.dietaryPreferences ?? [] } : null),
            loading: false,
            error: null,
          }));
        }
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign up failed. Try again.';
        setState((s) => ({ ...s, error: msg }));
        return { error: msg };
      }
    },
    [ensureProfileExists]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, error: null });
  }, []);

  const setError = useCallback((err: string | null) => {
    setState((s) => ({ ...s, error: err }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        ensureMyProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
