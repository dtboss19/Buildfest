import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignInModal } from '../components/SignInModal';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);

  if (loading) return <div className="page-loading">Loading…</div>;
  if (user) return <Navigate to="/profile/me" replace />;

  return (
    <div className="login-page">
      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <p className="login-page-hint">Sign in or create an account to contribute.</p>
    </div>
  );
}
