import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { foodShelters } from '../data/shelters';
import type { UserProfile } from '../types/database';
import type { ShelterPhoto } from '../types/database';
import type { CommunityPost } from '../types/database';
import type { FoodRescuePost } from '../types/database';
import { formatRelativeTime } from '../utils/formatDate';
import './ProfilePage.css';

const ANONYMOUS_AVATAR = 'https://api.dicebear.com/7.x/initials/svg?seed=Anonymous&backgroundColor=e0dce8';

export function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: myProfile, refreshProfile, ensureMyProfile } = useAuth();
  const isMe = userId === 'me' || (user && userId === user.id);
  const targetUserId = isMe ? user?.id : userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<ShelterPhoto[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [rescues, setRescues] = useState<FoodRescuePost[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'posts' | 'rescues' | 'comments'>('photos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', uid).single();
    if (error) throw error;
    return data as UserProfile;
  }, []);

  const buildFallbackProfileFromUser = useCallback((u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): UserProfile => {
    const displayName =
      (u.user_metadata?.display_name as string)?.trim() ||
      (u.email ? u.email.split('@')[0] : '') ||
      'User';
    return {
      id: u.id,
      user_id: u.id,
      display_name: displayName,
      avatar_url: null,
      bio: null,
      dietary_preferences: [],
      saved_shelters: [],
      is_private: false,
      created_at: new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    if (userId === 'me') {
      navigate('/', { replace: true });
      return;
    }
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const p = await fetchProfile(targetUserId);
        if (!mounted) return;
        setProfile(p);
        if (isMe || !p.is_private) {
          const [photosRes, postsRes, rescuesRes] = await Promise.all([
            supabase.from('shelter_photos').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(50),
            supabase.from('community_posts').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(50),
            supabase.from('food_rescue_posts').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(50),
          ]);
          if (!mounted) return;
          setPhotos((photosRes.data ?? []) as ShelterPhoto[]);
          setPosts((postsRes.data ?? []) as CommunityPost[]);
          setRescues((rescuesRes.data ?? []) as FoodRescuePost[]);
        }
      } catch (e) {
        if (mounted) {
          const msg = e instanceof Error ? e.message : 'Failed to load profile';
          const isLockError =
            msg.includes('LockManager') ||
            msg.includes('auth-token') ||
            msg.includes('timed out') ||
            msg.includes('NavigatorLockAcquireTimeoutError');
          if (isMe && user) {
            let resolved: UserProfile | null = null;
            try {
              resolved = await ensureMyProfile();
            } catch {
              // use fallback below
            }
            if (mounted && resolved) {
              setProfile(resolved);
              setError(null);
            } else if (mounted) {
              setProfile(buildFallbackProfileFromUser(user));
              setError(isLockError ? 'Session busy. Could not load from server. You can retry below.' : null);
            }
            if (mounted && !resolved) refreshProfile().catch(() => {});
          } else {
            setError(isLockError ? 'Session busy. Please refresh the page or try again in a moment.' : msg);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [targetUserId, isMe, fetchProfile, userId, user, navigate, refreshProfile, ensureMyProfile, buildFallbackProfileFromUser]);

  // For /profile/me, prefer Auth context profile so we never show "Profile not found" when context has it
  const displayProfile = (isMe && myProfile) ? myProfile : profile;
  const showRetryBanner = Boolean(error && displayProfile && isMe);
  if (!targetUserId && !user) return null;
  if (loading && !displayProfile) return <div className="page-loading">Loading profile…</div>;
  if (error && !displayProfile) return <div className="page-error">{error}</div>;
  if (!displayProfile) return <div className="page-error">Profile not found</div>;

  const isPrivateView = !isMe && displayProfile.is_private;
  const rawDisplayName = displayProfile.display_name?.trim() ?? '';
  const displayName = rawDisplayName.length > 2 ? rawDisplayName : (isMe ? 'Set your name' : displayProfile.display_name || 'User');
  const avatarUrl = displayProfile.avatar_url || (isPrivateView ? ANONYMOUS_AVATAR : undefined);
  const showContributions = isMe || !displayProfile.is_private;

  const handleRetryProfile = () => {
    setError(null);
    setLoading(true);
    ensureMyProfile()
      .then((p) => {
        if (p) setProfile(p);
        return refreshProfile();
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="profile-page">
      {showRetryBanner && (
        <div className="profile-retry-banner">
          <span>{error}</span>
          <button type="button" className="btn btn-primary" onClick={handleRetryProfile}>
            Retry
          </button>
        </div>
      )}
      <header className="profile-header">
        <img src={avatarUrl || ANONYMOUS_AVATAR} alt="" className="profile-avatar" />
        <div className="profile-meta">
          <h1 className="profile-name">{displayName}</h1>
          {!isPrivateView && displayProfile.bio && <p className="profile-bio">{displayProfile.bio}</p>}
          {!isPrivateView && displayProfile.dietary_preferences?.length > 0 && (
            <div className="profile-dietary">
              {displayProfile.dietary_preferences.map((d) => (
                <span key={d} className="profile-tag">{d}</span>
              ))}
            </div>
          )}
          <p className="profile-joined">Joined {new Date(displayProfile.created_at).toLocaleDateString()}</p>
        </div>
      </header>

      {showContributions && (
        <>
          {displayProfile.saved_shelters?.length > 0 && (
            <section className="profile-section">
              <h2>Saved shelters</h2>
              <ul className="saved-shelters-list">
                {displayProfile.saved_shelters.map((sid) => {
                  const s = foodShelters.find((x) => x.id === sid);
                  return s ? (
                    <li key={sid}>
                      <Link to={`/shelter/${sid}`}>{s.name}</Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
          <section className="profile-section">
            <div className="profile-tabs">
              {(['photos', 'posts', 'rescues'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 'photos' && (
              <div className="profile-grid">
                {photos.map((ph) => (
                  <div key={ph.id} className="profile-photo-card">
                    <Link to={`/shelter/${ph.shelter_id}#photos`}>
                      <img src={ph.photo_url} alt={ph.caption || 'Photo'} />
                      {ph.is_anonymous && <span className="anon-badge">Posted anonymously</span>}
                    </Link>
                  </div>
                ))}
                {photos.length === 0 && <p className="profile-empty">No photos yet</p>}
              </div>
            )}
            {activeTab === 'posts' && (
              <ul className="profile-list">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link to={`/shelter/${p.shelter_id}#community`}>
                      {p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                    </Link>
                    {p.is_anonymous && <span className="anon-badge">Anonymous</span>}
                    <span className="profile-item-meta">{formatRelativeTime(p.created_at)}</span>
                  </li>
                ))}
                {posts.length === 0 && <p className="profile-empty">No posts yet</p>}
              </ul>
            )}
            {activeTab === 'rescues' && (
              <ul className="profile-list">
                {rescues.map((r) => (
                  <li key={r.id}>
                    <Link to="/food-rescue">{r.event_name}</Link>
                    <span className="profile-item-meta">{r.status} · {formatRelativeTime(r.created_at)}</span>
                  </li>
                ))}
                {rescues.length === 0 && <p className="profile-empty">No food rescue posts yet</p>}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
