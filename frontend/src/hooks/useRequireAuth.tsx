import React, { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignInModal } from '../components/SignInModal';

/**
 * Returns a function that runs an action; if user is not logged in, opens SignInModal first.
 * Use for: post, upload, comment, claim, send chat.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const withAuth = useCallback(
    (action: () => void | Promise<void>): (() => void) => {
      return () => {
        if (!user) {
          setModalOpen(true);
          return;
        }
        void action();
      };
    },
    [user]
  );

  const modal = (
    <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Sign in to contribute" />
  );

  return { withAuth, isAuthenticated: !!user, requireAuthModal: modal, openSignIn: () => setModalOpen(true) };
}
