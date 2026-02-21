import { useState, useMemo } from 'react';
import type { DayOfWeek } from './types';
import type { FoodShelter } from './types';
import { foodShelters } from './data/shelters';
import { DAY_NAMES } from './data/shelters';
import { WeekStrip } from './components/WeekStrip';
import { ShelterCard } from './components/ShelterCard';
import { ShelterDetail } from './components/ShelterDetail';
import { SmsSignup } from './components/SmsSignup';
import { MapPanel } from './components/MapPanel';
import './App.css';

export default function App() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const d = new Date().getDay() as DayOfWeek;
    return d;
  });
  const [selectedShelter, setSelectedShelter] = useState<FoodShelter | null>(null);

  const sheltersForDay = useMemo(() => {
    return foodShelters.map((shelter) => ({
      shelter,
      daySchedule: shelter.schedule.find((e) => e.day === selectedDay),
    }));
  }, [selectedDay]);

  const sheltersWithPins = useMemo(() => {
    return sheltersForDay.map((x) => x.shelter);
  }, [sheltersForDay]);

  return (
    <div className="app">
      {selectedShelter && (
        <ShelterDetail
          shelter={selectedShelter}
          daySchedule={selectedShelter.schedule.find((e) => e.day === selectedDay)}
          onClose={() => setSelectedShelter(null)}
        />
      )}

      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon" aria-hidden>📍</span>
          <h1 className="header-title">St. Thomas Food Shelf</h1>
        </div>
        <div className="header-legend">
          <span className="legend-item"><span className="legend-dot legend-open" /> Open today</span>
          <span className="legend-item"><span className="legend-dot legend-closed" /> Closed today</span>
        </div>
      </header>

      <div className="app-layout">
        <aside className="left-panel">
          <div className="left-panel-inner">
            <h2 className="panel-title">Discover food shelves</h2>
            <p className="panel-subtitle">Pick a day on the calendar to see what’s open nearby (within 15 miles of campus).</p>

            <div className="discover-weekly-scroll" aria-label="Discover food shelves by day">
              <div className="week-section">
                <WeekStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
                <p className="day-label" aria-live="polite">{DAY_NAMES[selectedDay]}</p>
              </div>
              <div className="shelters-list-wrap">
                <section className="shelters-list" aria-label={`Food shelves — ${DAY_NAMES[selectedDay]}`}>
                  {sheltersForDay.map(({ shelter, daySchedule }) => (
                    <ShelterCard key={shelter.id} shelter={shelter} daySchedule={daySchedule} onSelect={setSelectedShelter} />
                  ))}
                </section>
              </div>
            </div>

            <SmsSignup />

            <footer className="panel-footer">
              <p>Minnesota Food HelpLine: <a href="tel:1-888-711-1151">1-888-711-1151</a> · <a href="https://www.hungersolutions.org/find-help/" target="_blank" rel="noopener noreferrer">Hunger Solutions</a></p>
            </footer>
          </div>
        </aside>

        <div className="right-panel">
          <MapPanel shelters={sheltersWithPins} />
        </div>
      </div>
    </div>
  );
}
