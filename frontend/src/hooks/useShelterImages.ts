import { useState, useCallback, useEffect } from 'react';
import type { UploadedImage } from '../types';

const STORAGE_KEY = 'stthomas-food-shelf-images';

function loadAll(): Record<string, UploadedImage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, UploadedImage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useShelterImages(shelterId: string) {
  const [images, setImages] = useState<UploadedImage[]>(() => {
    const all = loadAll();
    return all[shelterId] ?? [];
  });

  useEffect(() => {
    const all = loadAll();
    setImages(all[shelterId] ?? []);
  }, [shelterId]);

  const addImage = useCallback((dataUrl: string, caption?: string): string => {
    const newImg: UploadedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dataUrl,
      caption,
      createdAt: Date.now(),
    };
    const all = loadAll();
    const list = all[shelterId] ?? [];
    all[shelterId] = [...list, newImg];
    saveAll(all);
    setImages(all[shelterId]);
    return newImg.id;
  }, [shelterId]);

  const removeImage = useCallback((id: string) => {
    const all = loadAll();
    const list = (all[shelterId] ?? []).filter((img) => img.id !== id);
    if (list.length) all[shelterId] = list;
    else delete all[shelterId];
    saveAll(all);
    setImages(list);
  }, [shelterId]);

  const updateAnalysis = useCallback((imageId: string, analysis: UploadedImage['analysis']) => {
    const all = loadAll();
    const list = all[shelterId] ?? [];
    const idx = list.findIndex((img) => img.id === imageId);
    if (idx === -1) return;
    const nextList = list.map((img, i) =>
      i === idx ? { ...img, analysis: analysis ?? undefined } : img
    );
    all[shelterId] = nextList;
    saveAll(all);
    setImages(nextList);
  }, [shelterId]);

  return { images, addImage, removeImage, updateAnalysis };
}
