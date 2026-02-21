import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { getRandomGuestName } from '../utils/randomGuestName';
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
  ensureAnonymousSession: () => Promise<{ user: User | null; error: string | null }>;
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
    const isAnonymous = user.is_anonymous === true;
    const defaultOrAnon = (isAnonymous ? getRandomGuestName() : (user.email ? user.email.split('@')[0] : 'User'));
    const displayName =
      (user.user_metadata?.display_name as string)?.trim() ||
      defaultOrAnon ||
      'User';
    if (profile) {
      if (isAnonymous && (profile.display_name === 'User' || profile.display_name === 'Anonymous')) {
        const randomName = getRandomGuestName();
        await supabase.from('user_profiles').update({ display_name: randomName }).eq('user_id', user.id);
        return fetchProfile(user.id);
      }
      return profile;
    }
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

  const ensureAnonymousSession = useCallback(async (): Promise<{ user: User | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      const msg = error.message || 'Sign-in failed';
      return { user: null, error: msg };
    }
    if (!data.session?.user) return { user: null, error: 'No session' };
    const sessionUser = data.session.user;
    const profile = await ensureProfileExists(sessionUser).catch(() => null);
    setState({ user: sessionUser, profile: profile ?? null, loading: false, error: null });
    return { user: sessionUser, error: null };
  }, [ensureProfileExists]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setState((s) => (s.loading ? { ...s, user: null, profile: null, loading: false, error: null } : s));
      return;
    }

    let mounted = true;
    const maxWait = window.setTimeout(() => {
      if (mounted) setState((s) => (s.loading ? { ...s, loading: false } : s));
    }, 5000);

    const init = async (retry = false) => {
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
        if (!mounted) return;
        const session = anonData?.session;
        if (anonErr || !session?.user) {
          setState({ user: null, profile: null, loading: false, error: null });
          return;
        }
        // Set user and loading:false immediately so UI is responsive; load profile in background.
        setState({ user: session.user, profile: null, loading: false, error: null });
        ensureProfileExists(session.user).then((profile) => {
          if (!mounted) return;
          setState((s) => (s.user?.id === session.user.id ? { ...s, profile: profile ?? null } : s));
        }).catch(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
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
      window.clearTimeout(maxWait);
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
        ensureAnonymousSession,
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
