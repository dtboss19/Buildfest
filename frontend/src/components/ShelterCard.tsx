import { useRef, useState } from 'react';
import type { FoodShelter, ScheduleEntry } from '../types';
import { formatSlot } from '../utils/time';
import { useShelterImages } from '../hooks/useShelterImages';
import { analyzeFoodImage } from '../api/analyzeFood';

interface ShelterCardProps {
  shelter: FoodShelter;
  daySchedule: ScheduleEntry | undefined;
  onSelect: (shelter: FoodShelter) => void;
}

export function ShelterCard({ shelter, daySchedule, onSelect }: ShelterCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const { images, addImage, removeImage, updateAnalysis } = useShelterImages(shelter.id);

  const handleCardClick = () => onSelect(shelter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const imageId = addImage(dataUrl);
      setAnalyzingIds((prev) => new Set(prev).add(imageId));
      const analysis = await analyzeFoodImage(dataUrl);
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
      updateAnalysis(imageId, analysis ?? undefined);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isOpenToday = !!daySchedule;

  return (
    <article
      className={`shelter-card ${isOpenToday ? 'open-today' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
      aria-label={`View details for ${shelter.name}`}
    >
      <header className="shelter-card-header">
        <h3 className="shelter-name">{shelter.name}</h3>
        {isOpenToday && <span className="badge-open">Open today</span>}
        <span className="shelter-distance">{shelter.distanceMiles} mi from campus</span>
      </header>
      <p className="shelter-card-view-hint">Click for details, map & bus directions</p>

      <p className="shelter-address">
        {shelter.address}, {shelter.city}, {shelter.state} {shelter.zip}
      </p>

      <div className="shelter-card-links" onClick={(e) => e.stopPropagation()}>
        {shelter.website && (
          <a href={shelter.website} target="_blank" rel="noopener noreferrer" className="shelter-website">
            Website
          </a>
        )}
        {shelter.contact && (
          <a href={`tel:${shelter.contact.replace(/\D/g, '')}`} className="shelter-contact" onClick={(e) => e.stopPropagation()}>
            {shelter.contact}
          </a>
        )}
      </div>

      <section className="shelter-section">
        <h4>Hours today</h4>
        {daySchedule ? (
          <ul className="hours-list">
            {daySchedule.slots.map((slot, i) => (
              <li key={i}>{formatSlot(slot.open, slot.close)}</li>
            ))}
            {daySchedule.note && <li className="hours-note">{daySchedule.note}</li>}
          </ul>
        ) : (
          <p className="closed-today">Closed today</p>
        )}
      </section>

      {shelter.mealTimes && (
        <section className="shelter-section">
          <h4>Times to eat / pick up</h4>
          <p>{shelter.mealTimes}</p>
        </section>
      )}

      <section className="shelter-section">
        <h4>Eligibility</h4>
        <p>{shelter.eligibility}</p>
      </section>

      {shelter.notes && (
        <p className="shelter-notes">{shelter.notes}</p>
      )}

      <section className="shelter-section shelter-photos" onClick={(e) => e.stopPropagation()}>
        <h4>What’s available (community photos)</h4>
        <p className="photo-hint">Upload a photo of the food available. We’ll detect items and quantities and show them here.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
          aria-label="Upload image"
        />
        <button
          type="button"
          className="btn-upload"
          onClick={() => fileInputRef.current?.click()}
        >
          Add photo
        </button>
        {images.length > 0 && (
          <div className="photo-gallery">
            {images.map((img) => (
              <div key={img.id} className="photo-thumb">
                <img src={img.dataUrl} alt={img.caption || 'Shelter photo'} />
                {analyzingIds.has(img.id) && (
                  <span className="photo-analyzing">Detecting food…</span>
                )}
                {img.analysis?.items?.length ? (
                  <div className="photo-food-list">
                    <span className="photo-food-title">Detected:</span>
                    <ul>
                      {img.analysis.items.slice(0, 5).map((item, i) => (
                        <li key={i}>{item.name} — {item.quantity}{item.details ? ` (${item.details})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                ) : img.caption && !analyzingIds.has(img.id) ? (
                  <span className="photo-caption">{img.caption}</span>
                ) : null}
                <button
                  type="button"
                  className="btn-remove-photo"
                  onClick={() => removeImage(img.id)}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
