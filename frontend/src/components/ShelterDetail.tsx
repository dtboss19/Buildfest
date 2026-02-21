import type { FoodShelter, ScheduleEntry } from '../types';
import { formatSlot } from '../utils/time';
import { googleMapsPinUrl, googleMapsTransitUrl, metroTransitTripPlannerUrl } from '../utils/maps';
import { useShelterImages } from '../hooks/useShelterImages';

interface ShelterDetailProps {
  shelter: FoodShelter;
  daySchedule: ScheduleEntry | undefined;
  onClose: () => void;
}

function fullAddress(shelter: FoodShelter): string {
  return `${shelter.address}, ${shelter.city}, ${shelter.state} ${shelter.zip}`;
}

export function ShelterDetail({ shelter, daySchedule, onClose }: ShelterDetailProps) {
  const { images } = useShelterImages(shelter.id);
  const mapUrl = googleMapsPinUrl(shelter.lat, shelter.lng);
  const transitUrl = googleMapsTransitUrl(fullAddress(shelter));
  const metroUrl = metroTransitTripPlannerUrl();
  const bbox = `${shelter.lng - 0.01},${shelter.lat - 0.008},${shelter.lng + 0.01},${shelter.lat + 0.008}`;

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="detail-panel">
        <header className="detail-header">
          <h2 id="detail-title" className="detail-name">{shelter.name}</h2>
          <button type="button" className="detail-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="detail-body">
          <section className="detail-section detail-bus-section">
            <h3>Bus & transit</h3>
            <p className="detail-bus-hint">Plan your trip from St. Thomas campus. Use transit mode for bus and light rail.</p>
            <div className="detail-bus-links">
              <a href={transitUrl} target="_blank" rel="noopener noreferrer" className="btn btn-bus">
                Get bus directions (Google Maps)
              </a>
              <a href={metroUrl} target="_blank" rel="noopener noreferrer" className="btn btn-bus-secondary">
                Metro Transit trip planner
              </a>
            </div>
          </section>

          <section className="detail-section detail-meta">
            <p className="detail-address">{fullAddress(shelter)}</p>
            <p className="detail-distance">{shelter.distanceMiles} miles from campus</p>
          </section>

          <section className="detail-section detail-map-section">
            <h3>Map</h3>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="detail-map-link">
              View on Google Maps
            </a>
            <div className="detail-map-embed">
              <iframe
                title={`Map: ${shelter.name}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${shelter.lat}%2C${shelter.lng}`}
                width="100%"
                height="220"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          {shelter.website && (
            <section className="detail-section">
              <h3>Website</h3>
              <a href={shelter.website} target="_blank" rel="noopener noreferrer" className="detail-website">
                {shelter.website.replace(/^https?:\/\//, '')}
              </a>
            </section>
          )}

          {shelter.contact && (
            <p className="detail-contact">
              <a href={`tel:${shelter.contact.replace(/\D/g, '')}`}>{shelter.contact}</a>
            </p>
          )}

          <section className="detail-section">
            <h3>Hours today</h3>
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
            <section className="detail-section">
              <h3>Times to eat / pick up</h3>
              <p>{shelter.mealTimes}</p>
            </section>
          )}

          <section className="detail-section">
            <h3>Eligibility</h3>
            <p>{shelter.eligibility}</p>
          </section>

          {shelter.notes && <p className="detail-notes">{shelter.notes}</p>}

          {images.length > 0 && (
            <section className="detail-section detail-photos">
              <h3>Community photos & what’s available</h3>
              <div className="photo-gallery detail-photo-gallery">
                {images.map((img) => (
                  <div key={img.id} className="photo-thumb detail-photo-thumb">
                    <img src={img.dataUrl} alt={img.caption || 'Shelter photo'} />
                    {img.analysis?.items?.length ? (
                      <div className="photo-food-list detail-food-list">
                        <span className="photo-food-title">Detected:</span>
                        <ul>
                          {img.analysis.items.map((item, i) => (
                            <li key={i}><strong>{item.name}</strong> — {item.quantity}{item.details ? ` (${item.details})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
