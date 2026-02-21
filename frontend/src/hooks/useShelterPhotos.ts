import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSeedShelterPhotos } from '../data/seedData';
import type { ShelterPhoto } from '../types/database';

export function useShelterPhotos(shelterId: string, limit = 6) {
  const [photos, setPhotos] = useState<ShelterPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('shelter_photos')
          .select('id, shelter_id, user_id, photo_url, caption, is_anonymous, is_staff, analysis, created_at')
          .eq('shelter_id', shelterId)
          .order('created_at', { ascending: false })
          .limit(limit);
        const list = (data ?? []) as ShelterPhoto[];
        if (mounted) {
          if (list.length > 0) setPhotos(list);
          else {
            const seed = getSeedShelterPhotos().filter((p) => p.shelter_id === shelterId).slice(0, limit);
            setPhotos(seed);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [shelterId, limit]);

  return { photos, loading };
}
