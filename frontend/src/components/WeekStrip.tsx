import type { DayOfWeek } from '../types';
import { DAY_SHORT } from '../data/shelters';

interface WeekStripProps {
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
}

export function WeekStrip({ selectedDay, onSelectDay }: WeekStripProps) {
  return (
    <div className="week-strip">
      <div className="week-strip-inner">
        {(DAY_SHORT as unknown as string[]).map((label, i) => {
          const day = i as DayOfWeek;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              className={`week-day ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={`View ${label}`}
            >
              <span className="week-day-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
