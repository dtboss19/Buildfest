import React, { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * All visitors get an anonymous session; no login required.
 * withAuth just runs the action (no modal).
 */
export function useRequireAuth() {
  const { user } = useAuth();

  const withAuth = useCallback(
    (action: () => void | Promise<void>): (() => void) => {
      return () => {
        if (user) void action();
      };
    },
    [user]
  );

  return { withAuth, isAuthenticated: !!user, requireAuthModal: null, openSignIn: () => {} };
}
