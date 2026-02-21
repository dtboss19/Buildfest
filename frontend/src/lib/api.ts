/**
 * Optional backend API (no Supabase). When VITE_API_URL is set, use these for food rescue and chat.
 * No auth: we send a persistent guest display name from localStorage.
 */

import { getRandomGuestName } from '../utils/randomGuestName';

const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

const GUEST_NAME_KEY = 'common-table-guest-name';

export function hasApiConfig(): boolean {
  return Boolean(API_URL);
}

export function getApiUrl(): string {
  return API_URL;
}

export function getGuestDisplayName(): string {
  try {
    const stored = localStorage.getItem(GUEST_NAME_KEY);
    if (stored && stored.length > 0) return stored;
  } catch {
    /* ignore */
  }
  const name = getRandomGuestName();
  try {
    localStorage.setItem(GUEST_NAME_KEY, name);
  } catch {
    /* ignore */
  }
  return name;
}

export async function apiGetFoodRescue(): Promise<{ id: string; event_name: string; description: string | null; quantity: string | null; photo_url: string | null; location: string | null; pickup_type: string; expiry_time: string; status: string; is_anonymous: boolean; special_notes: string | null; display_name?: string; created_at: string }[]> {
  const res = await fetch(`${API_URL}/api/food-rescue`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    user_id: r.display_name ?? 'Anonymous',
    is_anonymous: Boolean(r.is_anonymous),
    location_lat: null,
    location_lng: null,
    claimed_by: null,
    claimed_at: null,
  }));
}

export async function apiPostFoodRescue(body: {
  event_name: string;
  description?: string;
  quantity?: string;
  location?: string;
  pickup_type: string;
  expiry_time: string;
  is_anonymous: boolean;
  special_notes?: string;
  photo_url?: string | null;
  photoFile?: File | null;
}): Promise<{ id: string }> {
  const displayName = getGuestDisplayName();
  const formData = new FormData();
  formData.set('event_name', body.event_name);
  formData.set('expiry_time', body.expiry_time);
  formData.set('pickup_type', body.pickup_type);
  formData.set('is_anonymous', String(body.is_anonymous));
  formData.set('display_name', displayName);
  if (body.description) formData.set('description', body.description);
  if (body.quantity) formData.set('quantity', body.quantity);
  if (body.location) formData.set('location', body.location);
  if (body.special_notes) formData.set('special_notes', body.special_notes);
  if (body.photo_url) formData.set('photo_url', body.photo_url);
  if (body.photoFile) formData.set('photo', body.photoFile);
  const res = await fetch(`${API_URL}/api/food-rescue`, { method: 'POST', body: formData });
  const text = await res.text();
  if (!res.ok) {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Server returned HTML (405/404). Set VITE_API_URL to your Railway backend URL (e.g. https://buildfest-production-c655.up.railway.app) in the environment where the frontend is built (e.g. Vercel), then redeploy.'
      );
    }
    throw new Error(text || 'Failed to create post');
  }
  try {
    return JSON.parse(text) as { id: string };
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Server returned HTML instead of JSON. Set VITE_API_URL to your Railway backend URL and redeploy the frontend.'
      );
    }
    throw new Error('Invalid JSON response');
  }
}

export async function apiGetChatRooms(): Promise<{ id: string; name: string; type: string }[]> {
  const res = await fetch(`${API_URL}/api/chat/rooms`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetChatMessages(roomId: string): Promise<{ id: string; room_id: string; content: string; is_anonymous: boolean; display_name?: string; created_at: string; user_id?: string }[]> {
  const res = await fetch(`${API_URL}/api/chat/rooms/${roomId}/messages`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows.map((m: Record<string, unknown>) => ({
    ...m,
    user_id: m.display_name ?? m.user_id ?? 'Anonymous',
  }));
}

export async function apiPostChatMessage(roomId: string, content: string, isAnonymous: boolean): Promise<void> {
  const displayName = getGuestDisplayName();
  const res = await fetch(`${API_URL}/api/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, is_anonymous: isAnonymous, display_name: isAnonymous ? 'Anonymous' : displayName }),
  });
  if (!res.ok) throw new Error(await res.text());
}
