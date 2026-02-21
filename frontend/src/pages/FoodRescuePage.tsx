import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hasApiConfig, apiGetFoodRescue } from '../lib/api';
import { formatRelativeTime, formatDateTime, formatCountdown } from '../utils/formatDate';
import { getSeedFoodRescuePosts } from '../data/seedData';
import type { FoodRescuePost } from '../types/database';
import './FoodRescuePage.css';

type FilterType = 'all' | 'available' | 'foodbank' | 'community';

export function FoodRescuePage() {
  const [posts, setPosts] = useState<FoodRescuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let mounted = true;
    let timeoutId: number = 0;
    const clearTimeoutSafe = () => { if (timeoutId) window.clearTimeout(timeoutId); timeoutId = 0; };
    timeoutId = window.setTimeout(() => {
      timeoutId = 0;
      if (mounted) {
        setPosts(getSeedFoodRescuePosts());
        setLoading(false);
      }
    }, 6000);
    (async () => {
      if (hasApiConfig()) {
        try {
          const list = await apiGetFoodRescue();
          clearTimeoutSafe();
          if (mounted) setPosts(list.length > 0 ? (list as FoodRescuePost[]) : getSeedFoodRescuePosts());
        } catch (err) {
          if (mounted) setError(err instanceof Error ? err.message : String(err));
          if (mounted) setPosts(getSeedFoodRescuePosts());
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }
      try {
        const result = await Promise.race([
          supabase.from('food_rescue_posts').select('*').in('status', ['available', 'claimed']).order('expiry_time', { ascending: true }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
        ]);
        clearTimeoutSafe();
        if (!mounted) return;
        const { data, error: err } = result;
        const raw = err?.message ?? null;
        const isLockError = raw?.includes('LockManager') || raw?.includes('auth-token') || raw?.includes('timed out');
        setError(isLockError ? null : raw);
        const list = (data ?? []) as FoodRescuePost[];
        setPosts(list.length > 0 ? list : getSeedFoodRescuePosts());
      } catch {
        if (mounted) setPosts(getSeedFoodRescuePosts());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; clearTimeoutSafe(); };
  }, []);

  const filtered = posts.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'available') return p.status === 'available';
    if (filter === 'foodbank') return p.pickup_type === 'foodbank';
    if (filter === 'community') return p.pickup_type === 'community';
    return true;
  });

  const foodTags = (post: FoodRescuePost): string[] => {
    const notes = post.special_notes?.toLowerCase() ?? '';
    const tags: string[] = [];
    if (notes.includes('halal')) tags.push('halal');
    if (notes.includes('vegetarian') || notes.includes('vegan')) tags.push(notes.includes('vegan') ? 'vegan' : 'vegetarian');
    if (notes.includes('gluten')) tags.push('gluten-free');
    if (notes.includes('dairy')) tags.push('dairy-free');
    if (notes.includes('nut')) tags.push('nut-free');
    if (notes.includes('kosher')) tags.push('kosher');
    return tags.length ? tags : [];
  };

  return (
    <div className="food-rescue-page">
      <section className="food-rescue-hero">
        <p className="food-rescue-hero-text">Have food to share? Post it here and connect with people who need it.</p>
        <div className="food-rescue-hero-buttons">
          <Link to="/food-rescue/new" className="btn btn-primary">I have food to share</Link>
          <a href="#food-rescue-list" className="btn btn-secondary">I need food</a>
        </div>
      </section>

      <div className="food-rescue-filters">
        {(['all', 'available', 'foodbank', 'community'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`food-rescue-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'available' ? 'Available' : f === 'foodbank' ? 'Food Bank Pickup' : 'Community Pickup'}
          </button>
        ))}
      </div>

      <h1 className="food-rescue-title">Food Rescue</h1>
      {loading && <p className="loading">Loading…</p>}
      {error && <p className="error">{error}</p>}
      <ul id="food-rescue-list" className="food-rescue-list">
        {filtered.map((p) => {
          const countdown = formatCountdown(p.expiry_time);
          const tags = foodTags(p);
          return (
            <li key={p.id} className={`food-rescue-card food-rescue-card-horizontal ${p.status === 'claimed' ? 'claimed' : ''}`}>
              <div className="food-rescue-card-photo">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="rescue-thumb" />
                ) : (
                  <div className="rescue-thumb-placeholder">🍽</div>
                )}
              </div>
              <div className="food-rescue-card-body">
                <h3>{p.event_name}</h3>
                {p.status === 'available' && !countdown.expired && (
                  <p className="food-rescue-countdown" title={`Expires ${formatDateTime(p.expiry_time)}`}>
                    ⏱ Expires in {countdown.text}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="food-rescue-tags">
                    {tags.map((t) => (
                      <span key={t} className="food-rescue-tag">{t}</span>
                    ))}
                  </div>
                )}
                {p.description && <p className="food-rescue-desc">{p.description}</p>}
                {p.quantity && <p><strong>Quantity:</strong> {p.quantity}</p>}
                <p><strong>Location:</strong> {p.location ?? '—'}</p>
                <p><strong>Pick up by:</strong> {formatDateTime(p.expiry_time)}</p>
                <div className="food-rescue-card-badges">
                  <span className={`badge badge-${p.pickup_type}`}>{p.pickup_type}</span>
                  <span className={`badge badge-status-${p.status}`}>{p.status}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-state-icon">📦</span>
          <p>No food rescue posts match this filter.</p>
        </div>
      )}
    </div>
  );
}
