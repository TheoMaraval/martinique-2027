import { useEffect, useRef, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { tripDates } from '../../domain/slots';
import { formatDayShort } from '../../lib/format';
import { DayColumn } from './DayColumn';

export function PlanningGrid() {
  const { state } = useReadyTrip();
  const dates = tripDates(state.trip);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [activeDay, setActiveDay] = useState<string>(dates[0] ?? '');
  const datesKey = dates.join(',');

  // Met en surbrillance la puce du jour visible pendant le défilement horizontal de la grille.
  useEffect(() => {
    const root = gridRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.left - b.boundingClientRect.left);
      const date = visible[0]?.target.getAttribute('data-date');
      if (date) setActiveDay(date);
    }, { root, threshold: 0.6 });
    for (const el of Object.values(refs.current)) if (el) io.observe(el);
    return () => io.disconnect();
  }, [datesKey]);

  return (
    <section className="grid-wrap">
      <nav className="day-chips" aria-label="Aller au jour">
        {dates.map(d => (
          <button
            key={d} className={activeDay === d ? 'active' : ''} aria-current={activeDay === d ? 'true' : undefined}
            onClick={() => {
              setActiveDay(d);
              refs.current[d]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            }}
          >
            {formatDayShort(d)}
          </button>
        ))}
      </nav>
      <div className="grid" ref={gridRef}>
        {dates.map(d => <DayColumn key={d} date={d} columnRef={el => { refs.current[d] = el; }} />)}
      </div>
    </section>
  );
}
