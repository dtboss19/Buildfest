import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { hasSupabaseConfig } from '../lib/supabase';

export function Layout() {
  const location = useLocation();
  return (
    <div className="app">
      {!hasSupabaseConfig && (
        <div style={{ background: '#c53030', color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code> (see <code>.env.example</code>), then restart <code>npm run dev</code>.
        </div>
      )}
      <Navbar />
      <main className="app-main">
        <div key={location.pathname} className="route-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
