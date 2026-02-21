import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AnonymousToggle } from '../AnonymousToggle';
import { formatRelativeTime } from '../../utils/formatDate';
import { analyzeFoodImage } from '../../api/analyzeFood';
import type { ShelterPhoto } from '../../types/database';

interface ShelterPhotosTabProps {
  shelterId: string;
}

const ANONYMOUS_DISPLAY = 'Anonymous Community Member';

export function ShelterPhotosTab({ shelterId }: ShelterPhotosTabProps) {
  const { user, profile } = useAuth();
  const { withAuth } = useRequireAuth();
  const [photos, setPhotos] = useState<ShelterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('shelter_photos')
          .select('id, shelter_id, user_id, photo_url, caption, is_anonymous, is_staff, analysis, created_at')
          .eq('shelter_id', shelterId)
          .order('created_at', { ascending: false });
        if (!mounted) return;
        const rawMessage = fetchError?.message ?? null;
        const isAuthLockError = rawMessage?.includes('LockManager') || rawMessage?.includes('auth-token') || rawMessage?.includes('timed out');
        setError(isAuthLockError ? 'Unable to load photos right now. Please refresh the page.' : rawMessage);
        setPhotos((data ?? []) as ShelterPhoto[]);
      } catch (err) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        const isAuthLockError = msg.includes('LockManager') || msg.includes('auth-token') || msg.includes('timed out');
        setError(isAuthLockError ? 'Unable to load photos right now. Please refresh the page.' : msg);
        setPhotos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [shelterId]);

  const handleUpload = () => withAuth(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      setUploading(true);
      setError(null);
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${shelterId}/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('shelter-photos').upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('shelter-photos').getPublicUrl(path);
        const { data: newRow, error: insertErr } = await supabase.from('shelter_photos').insert({
          shelter_id: shelterId,
          user_id: user.id,
          photo_url: urlData.publicUrl,
          caption: caption.trim() || null,
          is_anonymous: isAnonymous,
          is_staff: false,
        }).select('*').single();
        if (insertErr) throw insertErr;
        setCaption('');
        setIsAnonymous(false);
        if (newRow) setPhotos((prev) => [newRow as ShelterPhoto, ...prev]);
        // Optional: run AI food detection and update the row (non-blocking)
        if (newRow?.id) {
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (dataUrl) {
            const analysis = await analyzeFoodImage(dataUrl);
            if (analysis?.items?.length) {
              await supabase.from('shelter_photos').update({ analysis: { items: analysis.items } }).eq('id', newRow.id);
              setPhotos((prev) => prev.map((p) => (p.id === newRow.id ? { ...p, analysis: { items: analysis.items } } : p)));
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  });

  const getDisplayName = (ph: ShelterPhoto) => {
    if (ph.is_anonymous) return ANONYMOUS_DISPLAY;
    return null;
  };

  return (
    <div className="shelter-photos-tab">
      {requireAuthModal}
      {loading && <p className="loading">Loading photos…</p>}
      {error && <p className="error">{error}</p>}
      {user && (
        <div className="photos-upload-form">
          <AnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} />
          <input type="text" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} className="caption-input" />
          <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>
      )}
      <div className="photos-grid">
        {photos.map((ph) => (
          <div key={ph.id} className="photo-card">
            <button type="button" className="photo-card-img-wrap" onClick={() => setLightboxId(ph.id)}>
              <img src={ph.photo_url} alt={ph.caption || 'Shelter photo'} />
            </button>
            <p className="photo-caption">{ph.caption}</p>
            <p className="photo-meta">
              <span className={ph.is_staff ? 'badge staff' : 'badge community'}>{ph.is_staff ? 'Food Bank Staff' : 'Community Contributor'}</span>
              {getDisplayName(ph) ?? '—'}
              <span className="photo-time">{formatRelativeTime(ph.created_at)}</span>
            </p>
          </div>
        ))}
      </div>
      {photos.length === 0 && !loading && <p className="empty">No photos yet. Be the first to add one!</p>}
      {lightboxId && (
        <div className="lightbox" role="dialog" onClick={() => setLightboxId(null)}>
          <img src={photos.find((p) => p.id === lightboxId)?.photo_url} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
