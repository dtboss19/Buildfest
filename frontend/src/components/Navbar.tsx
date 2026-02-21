import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Navbar.css';

const ANONYMOUS_AVATAR = 'https://api.dicebear.com/7.x/initials/svg?seed=Anonymous&backgroundColor=e0dce8';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate('/');
  };

  const rawName = profile?.display_name ?? '';
  const displayName = rawName.trim().length > 2 ? rawName.trim() : 'Set your name';
  const avatarUrl = displayName === 'Set your name' ? undefined : (profile?.avatar_url || undefined);

  const showUnreadDot = unreadCount > 0;

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Home">
          <span className="navbar-icon" aria-hidden>📍</span>
          <span className="navbar-title">Common Table</span>
        </Link>
        <nav className="navbar-links" aria-label="Main">
          <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`} end>Home</NavLink>
          <NavLink to="/food-rescue" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`}>Food Rescue</NavLink>
          <NavLink to="/community" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`} end>Community</NavLink>
          <NavLink to="/community/chat" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`}>Chat</NavLink>
        </nav>
        <div className="navbar-actions">
          {user ? (
            <>
              <button
                type="button"
                className="navbar-icon-btn"
                onClick={() => setNotificationsOpen((o) => !o)}
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
              >
                🔔
                {showUnreadDot && <span className="navbar-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              <div className="navbar-profile-wrap">
                <button
                  type="button"
                  className="navbar-avatar-btn"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <img
                    src={avatarUrl || ANONYMOUS_AVATAR}
                    alt=""
                    className="navbar-avatar-img"
                  />
                </button>
                {menuOpen && (
                  <>
                    <div className="navbar-menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="navbar-menu" role="menu">
                      <div className="navbar-menu-header">
                        <span className="navbar-menu-name">{displayName}</span>
                      </div>
                      <Link to="/profile/me" className="navbar-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                        My profile
                      </Link>
                      <button type="button" className="navbar-menu-item" role="menuitem" onClick={handleSignOut}>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="navbar-link navbar-link-cta">
              Log in
            </Link>
          )}
        </div>
      </div>
      {notificationsOpen && user && (
        <NotificationsDropdown
          onClose={() => setNotificationsOpen(false)}
          onNavigate={(path) => {
            setNotificationsOpen(false);
            navigate(path);
          }}
        />
      )}
    </header>
  );
}

function NotificationsDropdown({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const [list, setList] = useState<{ id: string; title: string | null; body: string | null; link_url: string | null; read_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('id, title, body, link_url, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!mounted) return;
      setError(err?.message ?? null);
      setList((data ?? []) as typeof list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    setList((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  };

  return (
    <>
      <div className="navbar-notif-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="navbar-notif-dropdown">
        <div className="navbar-notif-header">
          <span>Notifications</span>
          {list.some((n) => !n.read_at) && (
            <button type="button" className="link-button" onClick={markAllRead}>Mark all read</button>
          )}
        </div>
        {loading && <p className="navbar-notif-loading">Loading…</p>}
        {error && <p className="navbar-notif-error">{error}</p>}
        {!loading && !error && list.length === 0 && <p className="navbar-notif-empty">No notifications</p>}
        {!loading && list.length > 0 && (
          <ul className="navbar-notif-list">
            {list.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`navbar-notif-item ${n.read_at ? '' : 'navbar-notif-unread'}`}
                  onClick={() => {
                    if (n.link_url) onNavigate(n.link_url);
                    onClose();
                  }}
                >
                  <strong>{n.title ?? 'Notification'}</strong>
                  {n.body && <span>{n.body}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
