import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FoodShelter, ScheduleEntry } from '../types';
import { formatSlot } from '../utils/time';
import { useShelterPhotos } from '../hooks/useShelterPhotos';

interface ShelterCardProps {
  shelter: FoodShelter;
  daySchedule: ScheduleEntry | undefined;
  onSelect: (shelter: FoodShelter) => void;
  /** Compact layout for home page: single card, no expand, whole card links to shelter */
  compact?: boolean;
}

function foodTypeChips(mealTimes: string | undefined): ('groceries' | 'hot meals' | 'both')[] {
  if (!mealTimes) return ['both'];
  const m = mealTimes.toLowerCase();
  const hasMeal = /meal|hot\s|dinner|lunch|breakfast/.test(m);
  const hasPantry = /pantry|distribution|shelf|pick-up|pickup/.test(m);
  if (hasMeal && hasPantry) return ['groceries', 'hot meals'];
  if (hasMeal) return ['hot meals'];
  if (hasPantry) return ['groceries'];
  return ['both'];
}

export function ShelterCard({ shelter, daySchedule, onSelect, compact }: ShelterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const { photos, loading } = useShelterPhotos(shelter.id, 3);
  const isOpenToday = !!daySchedule;
  const foodTypes = foodTypeChips(shelter.mealTimes);

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const hoursInline = daySchedule
    ? daySchedule.slots.map((s) => formatSlot(s.open, s.close)).join(', ')
    : 'Closed today';

  if (compact) {
    return (
      <Link
        to={`/shelter/${shelter.id}`}
        className={`shelter-card-compact ${isOpenToday ? 'open-today' : ''}`}
        aria-label={`${shelter.name}, ${shelter.distanceMiles} miles away`}
      >
        <div className="compact-row1">
          <span className="compact-name">{shelter.name}</span>
          {isOpenToday && <span className="compact-badge">Open today</span>}
          <span className="compact-distance">{shelter.distanceMiles} mi</span>
        </div>
        <p className="compact-address">{shelter.address}, {shelter.city}</p>
        <div className="compact-meta">
          {foodTypes.map((t) => (
            <span key={t} className="compact-food-tag">{t}</span>
          ))}
          {hoursInline && <span>{hoursInline}</span>}
        </div>
      </Link>
    );
  }

  return (
    <article
      className={`shelter-card ${isOpenToday ? 'open-today' : ''} ${expanded ? 'shelter-card-expanded' : ''}`}
      onClick={() => setExpanded((prev) => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
      aria-expanded={expanded}
      aria-label={expanded ? undefined : `Expand ${shelter.name}`}
    >
      <button
        type="button"
        className="shelter-card-save-btn"
        onClick={(e) => { e.stopPropagation(); setSaved((s) => !s); }}
        aria-label={saved ? 'Unsave' : 'Save'}
        title={saved ? 'Unsave' : 'Save'}
      >
        {saved ? '🔖' : '📑'}
      </button>
      <div className="shelter-card-summary">
        <header className="shelter-card-header">
          <h3 className="shelter-name">{shelter.name}</h3>
          {isOpenToday && <span className="badge-open">Open today</span>}
          <span className="shelter-distance">{shelter.distanceMiles} mi from campus</span>
        </header>
        <p className="shelter-card-hours-inline">{hoursInline}</p>
        {foodTypes.length > 0 && (
          <div className="shelter-card-food-types">
            {foodTypes.map((t) => (
              <span key={t} className="shelter-card-food-type">{t}</span>
            ))}
          </div>
        )}
        <p className="shelter-card-about">
          {shelter.address}, {shelter.city}, {shelter.state} {shelter.zip}
        </p>
        <button
          type="button"
          className="shelter-card-expand-btn"
          onClick={toggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand for more details'}
        >
          <span className="shelter-card-expand-icon" aria-hidden>{expanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {expanded && (
        <div className="shelter-card-details" onClick={(e) => e.stopPropagation()}>
          <p className="shelter-card-view-hint">
            <Link to={`/shelter/${shelter.id}`}>View details, map & photos →</Link>
          </p>

          <div className="shelter-card-links">
            {shelter.website && (
              <a href={shelter.website} target="_blank" rel="noopener noreferrer" className="shelter-website">
                Website
              </a>
            )}
            {shelter.contact && (
              <a href={`tel:${shelter.contact.replace(/\D/g, '')}`} className="shelter-contact">
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

          <section className="shelter-section shelter-photos">
            <h4>Community photos</h4>
            {loading && <p className="photo-hint">Loading…</p>}
                {!loading && photos.length > 0 && (
              <div className="photo-gallery">
                {photos.slice(0, 3).map((ph) => (
                  <div key={ph.id} className="photo-thumb">
                    <img src={ph.photo_url} alt={ph.caption || 'Shelter photo'} />
                    <span className={`badge ${ph.is_staff ? 'staff' : 'community'}`}>{ph.is_staff ? 'Food Bank Staff' : 'Community Contributor'}</span>
                    {ph.analysis?.items?.length ? (
                      <div className="photo-food-list">
                        <span className="photo-food-title">Detected:</span>
                        <ul>
                          {ph.analysis.items.slice(0, 3).map((item, i) => (
                            <li key={i}>{item.name} — {item.quantity}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <Link to={`/shelter/${shelter.id}#photos`} className="btn-upload">
              {photos.length > 0 ? 'View all photos' : 'Add photo'}
            </Link>
          </section>
        </div>
      )}
    </article>
  );
}
