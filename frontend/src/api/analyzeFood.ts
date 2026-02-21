import type { FoodDetection, FoodDetectionItem } from '../types';

const API_BASE = import.meta.env.VITE_SMS_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

function normalizeItem(raw: unknown): FoodDetectionItem | null {
  if (!raw || typeof raw !== 'object' || !('name' in (raw as object))) return null;
  const o = raw as Record<string, unknown>;
  const name = o.name != null ? String(o.name) : '';
  const quantity = o.quantity != null ? String(o.quantity) : '';
  const details = o.details != null ? String(o.details) : '';
  return { name, quantity, details };
}

export async function analyzeFoodImage(dataUrl: string): Promise<FoodDetection | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/analyze-food-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data) return null;
    const rawItems = Array.isArray(data.items) ? data.items : (data as { items?: unknown[] }).items;
    const items = Array.isArray(rawItems)
      ? rawItems.map(normalizeItem).filter((x): x is FoodDetectionItem => x !== null)
      : [];
    return { items };
  } catch {
    return null;
  }
}
