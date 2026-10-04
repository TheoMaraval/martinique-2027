import { useReadyTrip } from '../../data/TripContext';
import { durationLabel } from '../../domain/durations';
import type { DragData } from './PlanningContext';

/** Petite carte qui suit le doigt / la souris pendant un glisser-déposer. */
export function DragPreview({ data }: { data: DragData }) {
  const { state } = useReadyTrip();
  let name = '';
  let duration = '';
  if (data.type === 'wish') {
    name = data.item.activity.name;
    duration = durationLabel(data.item.duration);
  } else {
    const e = state.events.find(x => x.id === data.eventId);
    name = state.activities.find(a => a.id === e?.activity_id)?.name ?? 'Activité';
    duration = e ? durationLabel(e.duration) : '';
  }
  return (
    <div className="drag-preview">
      <strong>{name}</strong>{duration && <> <span className="muted">{duration}</span></>}
    </div>
  );
}
