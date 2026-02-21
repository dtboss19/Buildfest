import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DIETARY_OPTIONS, type DietaryPreference } from '../types/database';
import './EditProfilePage.css';

export function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? '');
      setDietaryPreferences((profile.dietary_preferences ?? []) as DietaryPreference[]);
      setIsPrivate(profile.is_private ?? false);
    }
    setLoading(false);
  }, [user, profile, navigate]);

  const toggleDietary = (d: DietaryPreference) => {
    setDietaryPreferences((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          dietary_preferences: dietaryPreferences,
          is_private: isPrivate,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);
      if (updateErr) throw updateErr;
      await refreshProfile();
      navigate('/profile/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !window.confirm('Are you sure? This cannot be undone.')) return;
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!user) return null;
  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="edit-profile-page">
      <h1>Edit profile</h1>
      <Link to="/profile/me" className="back-link">← Back to profile</Link>
      {error && <p className="edit-profile-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="edit-profile-form">
        <label>
          Avatar
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label>
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </label>
        <fieldset>
          <legend>Dietary preferences</legend>
          <div className="dietary-chips">
            {DIETARY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${dietaryPreferences.includes(d) ? 'chip-selected' : ''}`}
                onClick={() => toggleDietary(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="checkbox-label">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Private profile (only name and avatar visible to others)
        </label>
        <div className="edit-profile-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
            Delete account
          </button>
        </div>
      </form>
    </div>
  );
}
