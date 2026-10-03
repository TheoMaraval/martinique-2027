import { useMemo, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { itinerary, routePoints } from '../../domain/itinerary';
import { ExpensesTable } from './ExpensesTable';
import { RouteMap } from './RouteMap';
import { DayRecap } from './DayRecap';

export function RoadbookTab() {
  const { state, me } = useReadyTrip();
  const [mine, setMine] = useState(false);
  const personId = mine ? me : null;
  const days = useMemo(() => itinerary(state, personId), [state, personId]);
  const points = useMemo(() => routePoints(state, personId), [state, personId]);
  return (
    <div className="roadbook">
      <label className="toggle switch">
        <input type="checkbox" role="switch" checked={mine} onChange={e => setMine(e.target.checked)} />
        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
        <span>Mon parcours uniquement</span>
      </label>
      <RouteMap points={points} />
      <DayRecap days={days} />
      <ExpensesTable highlight={me} />
    </div>
  );
}
