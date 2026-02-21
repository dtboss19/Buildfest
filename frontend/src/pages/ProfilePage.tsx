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
  const { user, profile: myProfile, refreshProfile } = useAuth();
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

  useEffect(() => {
    if (!targetUserId) {
      if (!user && userId === 'me') navigate('/login');
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
          if (isMe) {
            await refreshProfile();
            if (mounted) setError(null);
          } else {
            setError(e instanceof Error ? e.message : 'Failed to load profile');
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [targetUserId, isMe, fetchProfile, userId, user, navigate, refreshProfile]);

  // For /profile/me, prefer Auth context profile so we never show "Profile not found" when context has it
  const displayProfile = (isMe && myProfile) ? myProfile : profile;
  if (!targetUserId && !user) return null;
  if (loading && !displayProfile) return <div className="page-loading">Loading profile…</div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!displayProfile) return <div className="page-error">Profile not found</div>;

  const isPrivateView = !isMe && displayProfile.is_private;
  const rawDisplayName = displayProfile.display_name?.trim() ?? '';
  const displayName = rawDisplayName.length > 2 ? rawDisplayName : (isMe ? 'Set your name' : displayProfile.display_name || 'User');
  const avatarUrl = displayProfile.avatar_url || (isPrivateView ? ANONYMOUS_AVATAR : undefined);
  const showContributions = isMe || !displayProfile.is_private;

  return (
    <div className="profile-page">
      <header className="profile-header">
        <img src={avatarUrl || ANONYMOUS_AVATAR} alt="" className="profile-avatar" />
        <div className="profile-meta">
          <h1 className="profile-name">
            {isMe && displayName === 'Set your name' ? (
              <Link to="/profile/me/edit">{displayName}</Link>
            ) : (
              displayName
            )}
          </h1>
          {!isPrivateView && displayProfile.bio && <p className="profile-bio">{displayProfile.bio}</p>}
          {!isPrivateView && displayProfile.dietary_preferences?.length > 0 && (
            <div className="profile-dietary">
              {displayProfile.dietary_preferences.map((d) => (
                <span key={d} className="profile-tag">{d}</span>
              ))}
            </div>
          )}
          <p className="profile-joined">Joined {new Date(displayProfile.created_at).toLocaleDateString()}</p>
          {isMe && (
            <Link to="/profile/me/edit" className="btn btn-primary">Edit profile</Link>
          )}
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
