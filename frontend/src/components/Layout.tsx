import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { hasSupabaseConfig } from '../lib/supabase';

export function Layout() {
  const location = useLocation();
  const renderCount = useRef(0);
  renderCount.current += 1;
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:render',message:'Layout render',data:{count:renderCount.current,path:location.pathname,ts:Date.now()},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
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
