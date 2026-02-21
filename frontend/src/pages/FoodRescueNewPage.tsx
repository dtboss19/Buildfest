import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AnonymousToggle } from '../components/AnonymousToggle';
import type { PickupType } from '../types/database';
import './FoodRescueNewPage.css';

export function FoodRescueNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { withAuth } = useRequireAuth();
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [pickupType, setPickupType] = useState<PickupType>('both');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => withAuth(async () => {
    if (!user || !eventName.trim() || !expiryTime) return;
    setLoading(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('food-rescue-photos').upload(path, photoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('food-rescue-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const { error: insertErr } = await supabase.from('food_rescue_posts').insert({
        user_id: user.id,
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
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  });

  if (!user) {
    return <div className="food-rescue-new-page"><p className="loading">Loading…</p></div>;
  }

  return (
    <div className="food-rescue-new-page">
      <h1>Create food rescue post</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit()(); }} className="rescue-form">
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
