import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DayOfWeek } from '../types';
import type { FoodShelter } from '../types';
import { foodShelters, DAY_NAMES } from '../data/shelters';
import { WeekStrip } from '../components/WeekStrip';
import { ShelterCard } from '../components/ShelterCard';
import { MapPanel } from '../components/MapPanel';
import { SmsSignup } from '../components/SmsSignup';
import { isOpenAtTime, getFirstOpenTime, formatTime } from '../utils/time';
import { getSeedFoodRescuePosts } from '../data/seedData';
import { getSeedChatMessages } from '../data/seedData';
import '../App.css';
import './HomePage.css';

const SHELTER_FINDER_ID = 'shelter-finder';

type DietaryFilter = 'all' | 'vegetarian' | 'halal' | 'kosher' | 'gluten-free' | 'no-requirements';

function shelterMatchesDietary(shelter: FoodShelter, filter: DietaryFilter): boolean {
  const opts = shelter.dietary_options ?? ['no-requirements'];
  if (filter === 'all') return true;
  if (filter === 'no-requirements') return opts.length === 0 || opts.includes('no-requirements');
  return opts.includes(filter);
}

function getOpenNowCount(
  sheltersForDay: { shelter: FoodShelter; daySchedule: { slots: { open: string; close: string }[] } | undefined }[],
  currentDay: DayOfWeek,
  nowMinutes: number
): number {
  const today = new Date().getDay() as DayOfWeek;
  if (currentDay !== today) return 0;
  return sheltersForDay.filter(({ daySchedule }) => daySchedule && isOpenAtTime(daySchedule.slots, nowMinutes)).length;
}

type NextOpening = { name: string; time: string } | null;

function getNextOpening(
  sheltersForDay: { shelter: FoodShelter; daySchedule: { slots: { open: string; close: string }[] } | undefined }[],
  currentDay: DayOfWeek,
  nowMinutes: number
): NextOpening {
  const today = new Date().getDay() as DayOfWeek;
  const openNow = getOpenNowCount(sheltersForDay, currentDay, nowMinutes);
  if (openNow > 0) return null;
  const tomorrow = ((currentDay + 1) % 7) as DayOfWeek;
  let first: { name: string; time: string; minutes: number } | null = null;
  for (const shelter of foodShelters) {
    const entry = shelter.schedule.find((e) => e.day === tomorrow);
    if (!entry?.slots?.length) continue;
    const t = getFirstOpenTime(entry.slots);
    if (!t) continue;
    const [h, m] = t.split(':').map(Number);
    const minutes = (h ?? 0) * 60 + (m ?? 0);
    const timeStr = formatTime(t);
    if (!first || minutes < first.minutes) first = { name: shelter.name, time: timeStr, minutes };
  }
  return first ? { name: first.name, time: first.time } : null;
}

function formatCountdown(expiryTime: string): string {
  const now = Date.now();
  const exp = new Date(expiryTime).getTime();
  const diff = exp - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function HomePage() {
  const navigate = useNavigate();
  const today = new Date().getDay() as DayOfWeek;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => today);
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>('all');

  const sheltersForDay = useMemo(
    () =>
      foodShelters
        .filter((s) => shelterMatchesDietary(s, dietaryFilter))
        .map((shelter) => ({
          shelter,
          daySchedule: shelter.schedule.find((e) => e.day === selectedDay),
        })),
    [selectedDay, dietaryFilter]
  );

  const sheltersWithPins = useMemo(() => sheltersForDay.map((x) => x.shelter), [sheltersForDay]);
  const openNowCount = useMemo(
    () => getOpenNowCount(sheltersForDay, selectedDay, nowMinutes),
    [sheltersForDay, selectedDay, nowMinutes]
  );
  const nextOpening = useMemo(
    () => getNextOpening(sheltersForDay, selectedDay, nowMinutes),
    [sheltersForDay, selectedDay, nowMinutes]
  );

  const handleSelectShelter = (shelter: FoodShelter) => navigate(`/shelter/${shelter.id}`);

  const scrollToFinder = () => {
    document.getElementById(SHELTER_FINDER_ID)?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToSms = () => {
    document.getElementById('sms-alerts')?.scrollIntoView({ behavior: 'smooth' });
  };

  const seedRescues = getSeedFoodRescuePosts().filter((r) => r.status === 'available').slice(0, 3);
  const openRightNowShelters = useMemo(() => {
    if (selectedDay !== today) return [];
    return foodShelters
      .filter((s) => shelterMatchesDietary(s, dietaryFilter))
      .map((s) => ({ shelter: s, daySchedule: s.schedule.find((e) => e.day === today) }))
      .filter((x) => x.daySchedule && isOpenAtTime(x.daySchedule.slots, nowMinutes))
      .sort((a, b) => a.shelter.distanceMiles - b.shelter.distanceMiles)
      .slice(0, 3);
  }, [selectedDay, today, nowMinutes, dietaryFilter]);
  const seedQuotes = [
    ...getSeedChatMessages('General Discussion').slice(0, 2),
    getSeedChatMessages('Recipes with Food Shelf Items')[0],
  ].filter(Boolean);

  const recipeOfTheWeek = {
    title: 'Simple Rice & Bean Bowl',
    prep: '~20 min',
    ingredients: 'Rice, canned beans, canned tomatoes, onion, garlic, salt, pepper, oil',
    steps: '1. Cook rice. 2. Sauté onion and garlic in oil. 3. Add canned tomatoes and beans, simmer 10 min. 4. Season with salt and pepper. 5. Serve over rice.',
  };
  const [recipeWeekExpanded, setRecipeWeekExpanded] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll('.home-hero, .home-how, .home-finder, .home-sms, .home-rescue-preview, .home-community-preview');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('home-section-visible');
        });
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.05 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page">
      {/* Section 1: Hero */}
      <section className="home-hero home-section-visible">
        <div className="home-hero-inner">
          <h1 className="home-hero-headline">Food resources for everyone, every day.</h1>
          <p className="home-hero-subheadline">
            Find free food near you, rescue surplus food from events, and connect with your community — all in one place.
          </p>
          <div className="home-hero-ctas">
            <button type="button" className="home-btn home-btn-primary" onClick={scrollToFinder}>
              Find Food Near Me
            </button>
            <Link to="/food-rescue/new" className="home-btn home-btn-secondary">
              Share Surplus Food
            </Link>
            <button type="button" className="home-btn home-btn-tertiary" onClick={scrollToSms}>
              Get text alerts
            </button>
            <Link to="/community/chat" className="home-btn home-btn-tertiary">
              Chat
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="home-how">
        <div className="home-how-inner home-how-four">
          <div className="home-how-col">
            <span className="home-how-icon">🗓️</span>
            <h3 className="home-how-title">Find food any day</h3>
            <p className="home-how-desc">
              Browse food shelves open today, this week, or any day. Filter by distance and what you need.
            </p>
          </div>
          <div className="home-how-col">
            <span className="home-how-icon">📱</span>
            <h3 className="home-how-title">Daily text alerts</h3>
            <p className="home-how-desc">
              Get a text each morning with the closest food shelves open that day. No app to open — just check your phone.
            </p>
          </div>
          <div className="home-how-col">
            <span className="home-how-icon">🚨</span>
            <h3 className="home-how-title">Rescue surplus food</h3>
            <p className="home-how-desc">
              Have leftover food from a wedding or event? Post it here and connect with food banks or people who need it — today.
            </p>
          </div>
          <div className="home-how-col">
            <span className="home-how-icon">💬</span>
            <h3 className="home-how-title">Connect with your community</h3>
            <p className="home-how-desc">
              Chat with others, share tips, ask questions, and upload photos of local food resources.
            </p>
          </div>
        </div>
      </section>

      {/* Open right now (only when shelters currently open) */}
      {openRightNowShelters.length > 0 && (
        <section className="home-open-now-section">
          <div className="home-open-now-inner">
            <h2 className="home-section-title">Open right now</h2>
            <p className="home-section-subtitle">These places are open at this moment</p>
            <div className="home-open-now-cards">
              {openRightNowShelters.map(({ shelter, daySchedule }) => (
                <Link key={shelter.id} to={`/shelter/${shelter.id}`} className="home-open-now-card">
                  <span className="home-open-now-dot" aria-hidden>🟢</span>
                  <span className="home-open-now-name">{shelter.name}</span>
                  <span className="home-open-now-miles">{shelter.distanceMiles} mi</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Find food near you: calendar + list + map */}
      <section id={SHELTER_FINDER_ID} className="home-finder">
        <div className="home-finder-inner">
          <h2 className="home-section-title">Find food near you</h2>
          <p className="home-section-subtitle">Open today and this week near St. Paul & Minneapolis</p>

          <div className="home-finder-dietary">
            {(['all', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'no-requirements'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`home-dietary-pill ${dietaryFilter === f ? 'active' : ''}`}
                onClick={() => setDietaryFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'no-requirements' ? 'No Requirements' : f === 'gluten-free' ? 'Gluten-Free' : f === 'halal' ? 'Halal' : f === 'kosher' ? 'Kosher' : 'Vegetarian'}
              </button>
            ))}
          </div>
          <div className="home-finder-two-col">
            <div className="home-finder-left">
              <div className="home-finder-week">
                <WeekStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
                <p className="home-finder-day-label" aria-live="polite">{DAY_NAMES[selectedDay]}</p>
              </div>
              {openNowCount > 0 ? (
                <div className="home-open-now home-open-now-green" role="status">
                  🟢 {openNowCount} place{openNowCount !== 1 ? 's' : ''} open right now near campus
                </div>
              ) : nextOpening ? (
                <div className="home-open-now home-open-now-grey" role="status">
                  Next opening: {nextOpening.name} opens at {nextOpening.time} tomorrow
                </div>
              ) : null}
              <div className="home-shelter-list-scroll">
                <div className="home-shelter-list" aria-label={`Food shelves — ${DAY_NAMES[selectedDay]}`}>
                  {sheltersForDay.map(({ shelter, daySchedule }) => (
                    <ShelterCard
                      key={shelter.id}
                      shelter={shelter}
                      daySchedule={daySchedule}
                      onSelect={handleSelectShelter}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="home-finder-right">
              <div className="home-map-wrap">
                <MapPanel shelters={sheltersWithPins} />
              </div>
              <div className="home-map-legend">
                <span className="home-legend-item"><span className="home-legend-dot home-legend-open" /> Open today</span>
                <span className="home-legend-item"><span className="home-legend-dot home-legend-closed" /> Closed today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: SMS alerts */}
      <section id="sms-alerts" className="home-sms">
        <div className="home-sms-inner">
          <SmsSignup />
        </div>
      </section>

      {/* Section 5: Food Rescue Preview */}
      <section className="home-rescue-preview">
        <div className="home-rescue-inner">
          <h2 className="home-section-title">Surplus food available now</h2>
          <div className="home-rescue-scroll">
            {seedRescues.map((r) => {
              const diff = new Date(r.expiry_time).getTime() - Date.now();
              const underTwoHours = diff > 0 && diff < 2 * 60 * 60 * 1000;
              const underOneHour = diff > 0 && diff < 60 * 60 * 1000;
              return (
                <Link key={r.id} to="/food-rescue" className="home-rescue-card home-rescue-card-clickable">
                  {underTwoHours && <span className="home-rescue-badge">🔥 Expires soon</span>}
                  <div className="home-rescue-card-img">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" />
                    ) : (
                      <div className="home-rescue-card-placeholder">🍽️</div>
                    )}
                  </div>
                  <div className="home-rescue-card-body">
                    <h3 className="home-rescue-card-title">{r.event_name}</h3>
                    <p className={`home-rescue-card-countdown ${underOneHour ? 'home-rescue-countdown-pulse' : ''}`}>{formatCountdown(r.expiry_time)}</p>
                    <span className="home-rescue-card-claim">View</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link to="/food-rescue" className="home-see-all">See all →</Link>
        </div>
      </section>

      {/* Recipe of the week */}
      <section className="home-recipe-week">
        <div className="home-recipe-week-inner">
          <h2 className="home-recipe-week-title">🍳 Recipe of the week</h2>
          <p className="home-recipe-week-sub">Made with common food shelf items</p>
          <div className="home-recipe-week-card">
            <h3 className="home-recipe-week-name">{recipeOfTheWeek.title}</h3>
            <p className="home-recipe-week-prep">⏱ {recipeOfTheWeek.prep}</p>
            <button type="button" className="home-recipe-week-toggle" onClick={() => setRecipeWeekExpanded((e) => !e)}>
              {recipeWeekExpanded ? 'Collapse' : 'See full recipe'}
            </button>
            {recipeWeekExpanded && (
              <div className="home-recipe-week-full">
                <p className="home-recipe-week-ingredients"><strong>Ingredients:</strong> {recipeOfTheWeek.ingredients}</p>
                <p className="home-recipe-week-steps"><strong>Steps:</strong> {recipeOfTheWeek.steps}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 7: Community Preview */}
      <section className="home-community-preview">
        <div className="home-community-inner">
          <h2 className="home-section-title">What people are saying</h2>
          <div className="home-quotes">
            {seedQuotes.map((m, i) => (
              <blockquote key={m.id} className="home-quote-card">
                "{m.content}"
              </blockquote>
            ))}
          </div>
          <Link to="/community" className="home-see-all">Join the conversation →</Link>
        </div>
      </section>

      {/* Section 8: Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <p className="home-footer-tagline">Common Table — Food resources for everyone, every day.</p>
          <nav className="home-footer-links">
            <Link to="/">Home</Link>
            <Link to="/food-rescue">Food Rescue</Link>
            <Link to="/community">Community</Link>
            <Link to="/community/chat">Chat</Link>
            <Link to="/about">About</Link>
          </nav>
          <p className="home-footer-contact">Questions? Contact tommieshelf@stthomas.edu</p>
          <p className="home-footer-built">Built at Tommie Buildfest 2026 💜</p>
        </div>
      </footer>
    </div>
  );
}
