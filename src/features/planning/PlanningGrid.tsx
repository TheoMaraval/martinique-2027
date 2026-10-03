import { useRef } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { tripDates } from '../../domain/slots';
import { formatDayShort } from '../../lib/format';
import { DayColumn } from './DayColumn';

export function PlanningGrid() {
  const { state } = useReadyTrip();
  const dates = tripDates(state.trip);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <section className="grid-wrap">
      <nav className="day-chips" aria-label="Aller au jour">
        {dates.map(d => (
          <button key={d} onClick={() => refs.current[d]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}>
            {formatDayShort(d)}
          </button>
        ))}
      </nav>
      <div className="grid">
        {dates.map(d => <DayColumn key={d} date={d} columnRef={el => { refs.current[d] = el; }} />)}
      </div>
    </section>
  );
}
