import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hasApiConfig, apiGetFoodRescue } from '../lib/api';
import { formatRelativeTime } from '../utils/formatDate';
import { foodShelters } from '../data/shelters';
import { getSeedCommunityFeedItems, type SeedFeedItem } from '../data/seedData';
import './CommunityPage.css';

type FeedItem = {
  id: string;
  type: 'photo' | 'post' | 'rescue';
  shelter_id: string | null;
  reference_id: string;
  created_at: string;
  is_anonymous: boolean;
  description?: string;
};

export function CommunityPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photos' | 'posts' | 'rescues'>('all');

  useEffect(() => {
    let mounted = true;
    let timeoutId: number = 0;
    const clearTimeoutSafe = () => { if (timeoutId) window.clearTimeout(timeoutId); timeoutId = 0; };
    timeoutId = window.setTimeout(() => {
      timeoutId = 0;
      if (mounted) {
        setItems(getSeedCommunityFeedItems() as FeedItem[]);
        setLoading(false);
      }
    }, 6000);
    (async () => {
      if (hasApiConfig()) {
        try {
          const rescues = await apiGetFoodRescue();
          clearTimeoutSafe();
          if (!mounted) return;
          const seedItems = getSeedCommunityFeedItems() as FeedItem[];
          const seedIds = new Set(seedItems.map((i) => i.id));
          const rescueItems: FeedItem[] = (rescues || [])
            .filter((r) => r.status === 'available' && !seedIds.has(r.id))
            .map((r) => ({
              id: r.id,
              type: 'rescue' as const,
              shelter_id: null,
              reference_id: r.id,
              created_at: r.created_at,
              is_anonymous: r.is_anonymous,
              description: r.event_name,
            }));
          const merged = [...seedItems, ...rescueItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setItems(merged);
        } catch {
          if (mounted) setItems(getSeedCommunityFeedItems() as FeedItem[]);
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }
      try {
        const [photos, posts, rescues] = await Promise.race([
          Promise.all([
            supabase.from('shelter_photos').select('id, shelter_id, created_at, is_anonymous').order('created_at', { ascending: false }).limit(30),
            supabase.from('community_posts').select('id, shelter_id, created_at, is_anonymous, content').order('created_at', { ascending: false }).limit(30),
            supabase.from('food_rescue_posts').select('id, created_at, is_anonymous, event_name').eq('status', 'available').order('created_at', { ascending: false }).limit(30),
          ]),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
        ]);
        clearTimeoutSafe();
        if (!mounted) return;
        const combined: FeedItem[] = [
          ...(photos.data ?? []).map((p) => ({ id: p.id, type: 'photo' as const, shelter_id: p.shelter_id, reference_id: p.id, created_at: p.created_at, is_anonymous: p.is_anonymous })),
          ...(posts.data ?? []).map((p) => ({ id: p.id, type: 'post' as const, shelter_id: p.shelter_id, reference_id: p.id, created_at: p.created_at, is_anonymous: p.is_anonymous, description: (p as { content?: string }).content?.slice(0, 80) })),
          ...(rescues.data ?? []).map((r) => ({ id: r.id, type: 'rescue' as const, shelter_id: null, reference_id: r.id, created_at: r.created_at, is_anonymous: r.is_anonymous, description: (r as { event_name?: string }).event_name })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const seed: SeedFeedItem[] = getSeedCommunityFeedItems();
        const merged = combined.length > 0 ? combined : seed as FeedItem[];
        setItems(merged);
      } catch {
        if (mounted) setItems(getSeedCommunityFeedItems() as FeedItem[]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; clearTimeoutSafe(); };
  }, []);

  const typeForFilter: Record<string, FeedItem['type']> = { photos: 'photo', posts: 'post', rescues: 'rescue' };
  const filtered = filter === 'all' ? items : items.filter((i) => i.type === typeForFilter[filter]);
  const author = (i: FeedItem) => i.is_anonymous ? 'Anonymous Community Member' : '—';

  return (
    <div className="community-page">
      <h1>Community feed</h1>
      <div className="community-layout">
        <div className="community-main">
          <div className="feed-filters">
            {(['all', 'photos', 'posts', 'rescues'] as const).map((f) => (
              <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {loading && <p className="loading">Loading…</p>}
          <ul className="feed-list">
            {filtered.map((i) => (
              <li key={`${i.type}-${i.id}`} className="feed-item">
                <span className="feed-icon" aria-hidden>{i.type === 'photo' ? '📷' : i.type === 'post' ? '💬' : '🍽'}</span>
                <div className="feed-item-content">
                  <span className="feed-item-author">{author(i)}</span>
                  {i.description && <span className="feed-item-desc"> — {i.description}{i.type === 'post' ? '…' : ''}</span>}
                  <div className="feed-item-meta">
                    {i.shelter_id && (
                      <Link to={`/shelter/${i.shelter_id}`} className="feed-shelter">
                        {foodShelters.find((s) => s.id === i.shelter_id)?.name ?? i.shelter_id}
                      </Link>
                    )}
                    {i.type === 'rescue' && <Link to="/food-rescue">View</Link>}
                    <span className="feed-time">{formatRelativeTime(i.created_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && !loading && (
            <div className="empty-state">
              <span className="empty-state-icon">🌱</span>
              <p>No activity yet. Be the first to share a photo or post!</p>
            </div>
          )}
        </div>
        <aside className="community-sidebar">
          <h3 className="sidebar-title">What&apos;s happening</h3>
          <ul className="sidebar-stats">
            <li>Total shelters listed: <strong>{foodShelters.length}</strong></li>
            <li>Food rescues active: <strong>3</strong></li>
            <li>Community members: <strong>24</strong></li>
            <li>Meals rescued this week: <strong>127</strong></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
