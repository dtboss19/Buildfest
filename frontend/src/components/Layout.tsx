import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AIChatBot } from './AIChatBot';
import { hasSupabaseConfig } from '../lib/supabase';
import { hasApiConfig } from '../lib/api';

export function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="app">
      {!hasSupabaseConfig && !hasApiConfig() && (
        <div style={{ background: '#c53030', color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>, or set <code>VITE_API_URL</code> to use the optional backend (see README).
        </div>
      )}
      <Navbar />
      <main className="app-main">
        <div key={location.pathname} className="route-fade">
          <Outlet />
        </div>
      </main>
      {isHomePage && <AIChatBot />}
    </div>
  );
}
