import { useReadyTrip } from '../../data/TripContext';
import type { Activity, DurationKey } from '../../domain/types';
import { allowsQuantity, canonicalDuration, durationLabel } from '../../domain/durations';
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
    const occurrence = nextOccurrence(state, activity.id, duration);
    place({ key: '', activity, duration, occurrence, total: 1, personIds: state.wishes
      .filter(w => w.activity_id === activity.id && canonicalDuration(w.duration) === duration && (!allowsQuantity(duration) || w.quantity >= occurrence))
      .map(w => w.person_id)
      .filter((p, i, all) => all.indexOf(p) === i) }, teamId, idx);
    onClose();
  };
  return (
    <Sheet title={`Ajouter · ${formatDay(date)} ${PART_LABEL[part]}`} onClose={onClose}>
      <ul className="pick-list">
        {/* Activité simple : une seule ligne ; séjour : une ligne par formule. */}
        {state.activities.flatMap(a => [...new Set(a.durations.map(canonicalDuration))].filter(d => canDrop(state, teamId, idx, d)).map(d => (
          <li key={`${a.id}|${d}`}>
            <button onClick={() => add(a, d)}>{a.name}{durationLabel(d) && <span className="muted"> · {durationLabel(d)}</span>}</button>
          </li>
        )))}
      </ul>
    </Sheet>
  );
}
