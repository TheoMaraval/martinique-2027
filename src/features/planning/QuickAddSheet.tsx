import { useReadyTrip } from '../../data/TripContext';
import type { Activity, DurationKey } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { nextOccurrence } from '../../domain/placement';
import { PART_LABEL, slotAt } from '../../domain/slots';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { usePlanning } from './PlanningContext';

export function QuickAddSheet({ teamId, idx, onClose }: { teamId: string; idx: number; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { place } = usePlanning();
  const { date, part } = slotAt(state.trip, idx);
  const add = (activity: Activity, duration: DurationKey) => {
    place({ key: '', activity, duration, occurrence: nextOccurrence(state, activity.id, duration), personIds: [] }, teamId, idx);
    onClose();
  };
  return (
    <Sheet title={`Ajouter · ${formatDay(date)} ${PART_LABEL[part]}`} onClose={onClose}>
      <ul className="pick-list">
        {state.activities.flatMap(a => a.durations.map(d => (
          <li key={`${a.id}|${d}`}>
            <button onClick={() => add(a, d)}>{a.name} <span className="muted">· {durationLabel(d)}</span></button>
          </li>
        )))}
      </ul>
    </Sheet>
  );
}
