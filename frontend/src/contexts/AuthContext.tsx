import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function formatAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('email rate limit exceeded')) {
    return 'Too many attempts for this email. Please wait a few minutes and try again.';
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data as UserProfile;
  }, []);

  /** If no profile row exists (trigger missed or race), create one so the app never shows "Profile not found". */
  const ensureProfileExists = useCallback(async (user: User): Promise<UserProfile | null> => {
    let profile = await fetchProfile(user.id);
    if (profile) return profile;
    const displayName =
      (user.user_metadata?.display_name as string)?.trim() ||
      (user.email ? user.email.split('@')[0] : 'User') ||
      'User';
    const { error: insertErr } = await supabase.from('user_profiles').insert({
      user_id: user.id,
      display_name: displayName,
    });
    // Unique violation = row was created (e.g. by trigger or another tab) — refetch and use it
    if (insertErr && insertErr.code !== '23505') return null;
    const after = await fetchProfile(user.id);
    return after;
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      const lockError = error?.message?.includes('LockManager') || error?.message?.includes('auth-token') || error?.message?.includes('timed out');
      if (lockError || !user) {
        setState((s) => ({ ...s, profile: null }));
        return;
      }
      const profile = await ensureProfileExists(user);
      setState((s) => ({ ...s, profile }));
    } catch {
      setState((s) => ({ ...s, profile: null }));
    }
  }, [ensureProfileExists]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const t0 = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:init-start',message:'auth init start',data:{t0},timestamp:t0,hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      let session;
      try {
        const result = await supabase.auth.getSession();
        const lockTimeout = result.error?.message?.includes('LockManager') || result.error?.message?.includes('auth-token') || result.error?.message?.includes('timed out');
        if (lockTimeout) {
          if (mounted) setState({ user: null, profile: null, loading: false, error: null });
          return;
        }
        session = result.data?.session;
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:getSession-done',message:'getSession done',data:{ms:Date.now()-t0},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const lockTimeout = msg.includes('LockManager') || msg.includes('auth-token') || msg.includes('timed out');
        if (mounted) setState({ user: null, profile: null, loading: false, error: lockTimeout ? null : (msg || null) });
        return;
      }
      if (!mounted) return;
      if (!session?.user) {
        setState({ user: null, profile: null, loading: false, error: null });
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:init-done',message:'auth init done (no session)',data:{ms:Date.now()-t0},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return;
      }
      const profile = await ensureProfileExists(session.user);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:ensureProfile-done',message:'ensureProfileExists done',data:{ms:Date.now()-t0},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      if (!mounted) return;
      setState({ user: session.user, profile, loading: false, error: null });
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:init-done',message:'auth init done (with session)',data:{totalMs:Date.now()-t0},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setState({ user: null, profile: null, loading: false, error: null });
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

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta: { displayName: string; dietaryPreferences?: string[] }
    ): Promise<{ error: string | null }> => {
      setState((s) => ({ ...s, error: null }));
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
      if (error) {
        const msg = formatAuthError(error.message);
        setState((s) => ({ ...s, error: msg }));
        return { error: msg };
      }
      if (data.user) {
        const { error: updateErr } = await supabase.from('user_profiles').update({
          display_name: meta.displayName,
          dietary_preferences: meta.dietaryPreferences ?? [],
        }).eq('user_id', data.user.id);
        setState((s) => ({
          ...s,
          user: data.user,
          profile: s.profile
            ? { ...s.profile, display_name: meta.displayName, dietary_preferences: meta.dietaryPreferences ?? [] }
            : null,
        }));
      }
      return { error: null };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    setState((s) => ({ ...s, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = formatAuthError(error.message);
      setState((s) => ({ ...s, error: msg }));
      return { error: msg };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, error: null });
  }, []);

  const setError = useCallback((err: string | null) => {
    setState((s) => ({ ...s, error: err }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
