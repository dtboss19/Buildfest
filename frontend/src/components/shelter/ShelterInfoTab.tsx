import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FoodShelter, ScheduleEntry } from '../../types';
import { formatSlot } from '../../utils/time';
import { googleMapsPinUrl, googleMapsTransitUrl, metroTransitTripPlannerUrl } from '../../utils/maps';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
interface ShelterInfoTabProps {
  shelter: FoodShelter;
}

function fullAddress(shelter: FoodShelter): string {
  return `${shelter.address}, ${shelter.city}, ${shelter.state} ${shelter.zip}`;
}

export function ShelterInfoTab({ shelter }: ShelterInfoTabProps) {
  const { user, profile, refreshProfile } = useAuth();
  const saved = profile?.saved_shelters?.includes(shelter.id) ?? false;
  const [saving, setSaving] = useState(false);

  const toggleSave = async () => {
    if (!hasSupabaseConfig || !user || !profile) return;
    setSaving(true);
    const next = saved
      ? (profile.saved_shelters ?? []).filter((id) => id !== shelter.id)
      : [...(profile.saved_shelters ?? []), shelter.id];
    await supabase.from('user_profiles').update({ saved_shelters: next }).eq('user_id', user.id);
    await refreshProfile();
    setSaving(false);
  };

  const mapUrl = googleMapsPinUrl(shelter.lat, shelter.lng);
  const transitUrl = googleMapsTransitUrl(fullAddress(shelter));
  const metroUrl = metroTransitTripPlannerUrl();
  const bbox = `${shelter.lng - 0.01},${shelter.lat - 0.008},${shelter.lng + 0.01},${shelter.lat + 0.008}`;
  const daySchedule = shelter.schedule.find((e) => e.day === new Date().getDay() as ScheduleEntry['day']);

  const featured = shelter.id === 'keystone'
    ? { imageUrl: '/shelters/keystone-featured.png', aiDescription: 'A wide variety of fresh fruits and vegetables, baked goods, and canned and packaged pantry staples are available.' }
    : null;

  return (
    <div className="shelter-info-tab">
      {featured && (
        <section className="shelter-featured-photo">
          <img src={featured.imageUrl} alt="Shelter interior" className="shelter-featured-img" />
          <p className="shelter-featured-ai">AI description: {featured.aiDescription}</p>
        </section>
      )}
      <p className="shelter-address">{fullAddress(shelter)}</p>
      <p className="shelter-distance">{shelter.distanceMiles} miles from campus</p>
      {hasSupabaseConfig && user && (
        <button type="button" className="btn btn-primary" onClick={toggleSave} disabled={saving}>
          {saved ? 'Unsave this shelter' : 'Save this shelter'}
        </button>
      )}
      <section>
        <h3>Hours</h3>
        {daySchedule ? (
          <ul className="hours-list">
            {daySchedule.slots.map((slot, i) => (
              <li key={i}>{formatSlot(slot.open, slot.close)}</li>
            ))}
          </ul>
        ) : (
          <p className="closed-today">Closed today</p>
        )}
      </section>
      {shelter.mealTimes && (
        <section>
          <h3>Meal times</h3>
          <p>{shelter.mealTimes}</p>
        </section>
      )}
      <section>
        <h3>Eligibility</h3>
        <p>{shelter.eligibility}</p>
      </section>
      <section>
        <h3>Bus & transit</h3>
        <a href={transitUrl} target="_blank" rel="noopener noreferrer" className="btn btn-bus">Get bus directions (Google Maps)</a>
        <a href={metroUrl} target="_blank" rel="noopener noreferrer" className="btn btn-bus-secondary">Metro Transit trip planner</a>
      </section>
      <section>
        <h3>Map</h3>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
        <div className="shelter-map-embed">
          <iframe
            title={`Map: ${shelter.name}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${shelter.lat}%2C${shelter.lng}`}
            width="100%"
            height="220"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
      </section>
      {shelter.website && (
        <p><a href={shelter.website} target="_blank" rel="noopener noreferrer">Website</a></p>
      )}
      {shelter.contact && (
        <p><a href={`tel:${shelter.contact.replace(/\D/g, '')}`}>{shelter.contact}</a></p>
      )}
    </div>
  );
}
