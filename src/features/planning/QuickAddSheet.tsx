import { useReadyTrip } from '../../data/TripContext';
import type { Activity, DurationKey } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { canDrop, nextOccurrence } from '../../domain/placement';
import { PART_LABEL, slotAt } from '../../domain/slots';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { usePlanning } from './PlanningContext';

export function QuickAddSheet({ teamId, idx, onClose }: { teamId: string; idx: number; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { place } = usePlanning();
  const { date, part } = slotAt(state.trip, idx);
  const add = (activity: Activity, duration: DurationKey) => {
    place({ key: '', activity, duration, occurrence: nextOccurrence(state, activity.id, duration), personIds: state.wishes.filter(w => w.activity_id === activity.id && w.duration === duration).map(w => w.person_id) }, teamId, idx);
    onClose();
  };
  return (
    <Sheet title={`Ajouter · ${formatDay(date)} ${PART_LABEL[part]}`} onClose={onClose}>
      <ul className="pick-list">
        {state.activities.flatMap(a => a.durations.filter(d => canDrop(state, teamId, idx, d)).map(d => (
          <li key={`${a.id}|${d}`}>
            <button onClick={() => add(a, d)}>{a.name} <span className="muted">· {durationLabel(d)}</span></button>
          </li>
        )))}
      </ul>
    </Sheet>
  );
}
