import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AnonymousToggle } from '../components/AnonymousToggle';
import { hasApiConfig, apiPostFoodRescue } from '../lib/api';
import type { PickupType } from '../types/database';
import './FoodRescueNewPage.css';

export function FoodRescueNewPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, ensureAnonymousSession } = useAuth();
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [pickupType, setPickupType] = useState<PickupType>('both');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useApi = hasApiConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !expiryTime) return;
    setLoading(true);
    setError(null);
    if (useApi) {
      try {
        await apiPostFoodRescue({
          event_name: eventName.trim(),
          description: description.trim() || undefined,
          quantity: quantity.trim() || undefined,
          location: location.trim() || undefined,
          pickup_type: pickupType,
          expiry_time: new Date(expiryTime).toISOString(),
          is_anonymous: isAnonymous,
          special_notes: specialNotes.trim() || undefined,
          photoFile: photoFile ?? undefined,
        });
        navigate('/food-rescue');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    let currentUser = user;
    if (!currentUser) {
      const result = await ensureAnonymousSession();
      currentUser = result.user;
      if (!currentUser) {
        const isLikelyAnonDisabled = result.error && /anonymous|disabled|422|sign.?in|unprocessable/i.test(result.error);
        const hint = isLikelyAnonDisabled
          ? 'Anonymous sign-in may be disabled. Enable it in Supabase: Dashboard → Authentication → Providers → Anonymous sign-ins. Also check Auth → Settings and ensure sign-ups are not disabled.'
          : (result.error || 'Unable to sign you in. Please try again.');
        setError(isLikelyAnonDisabled && result.error ? `${hint} (Error: ${result.error})` : hint);
        setLoading(false);
        return;
      }
    }
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('food-rescue-photos').upload(path, photoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('food-rescue-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const { error: insertErr } = await supabase.from('food_rescue_posts').insert({
        user_id: currentUser.id,
        event_name: eventName.trim(),
        description: description.trim() || null,
        quantity: quantity.trim() || null,
        photo_url: photoUrl,
        location: location.trim() || null,
        pickup_type: pickupType,
        expiry_time: new Date(expiryTime).toISOString(),
        status: 'available',
        is_anonymous: isAnonymous,
        special_notes: specialNotes.trim() || null,
      });
      if (insertErr) throw insertErr;
      navigate('/food-rescue');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRls = /row-level security|RLS|violates.*policy/i.test(msg);
      setError(isRls ? `${msg} Run the SQL in supabase/migrations/003_rls_allow_authenticated_inserts.sql in your Supabase SQL Editor.` : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!useApi && authLoading) {
    return <div className="food-rescue-new-page"><p className="loading">Loading…</p></div>;
  }

  return (
    <div className="food-rescue-new-page">
      <h1>Create food rescue post</h1>
      <p className="food-rescue-new-hint">{useApi ? 'No account or sign-in — you’ll get a random name. Post as anonymous if you prefer.' : 'No account needed — you’ll get a random name. Post as anonymous if you prefer.'}</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="rescue-form">
        <label>Event name <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required /></label>
        <label>Description <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></label>
        <label>Quantity <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 20 trays" /></label>
        <label>Photo <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} /></label>
        <label>Location <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or place" /></label>
        <label>Must pick up by <input type="datetime-local" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} required /></label>
        <fieldset>
          <legend>Pickup type</legend>
          {(['foodbank', 'community', 'both'] as const).map((t) => (
            <label key={t}><input type="radio" name="pickupType" value={t} checked={pickupType === t} onChange={() => setPickupType(t)} /> {t}</label>
          ))}
        </fieldset>
        <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} />
        <label>Special notes <textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} rows={2} /></label>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create post'}</button>
      </form>
    </div>
  );
}
