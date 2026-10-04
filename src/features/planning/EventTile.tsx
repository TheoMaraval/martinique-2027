import { useDraggable } from '@dnd-kit/core';
import { Link2, MessageCircle } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { TripEvent } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { eventSpan, participantsOf } from '../../domain/conflicts';
import { usePlanning, type DragData } from './PlanningContext';

export function EventTile({ event, idx, rank }: { event: TripEvent; idx: number; rank?: number }) {
  const { state } = useReadyTrip();
  const { openSheet, alerts } = usePlanning();
  const activity = state.activities.find(a => a.id === event.activity_id);
  const isStart = eventSpan(state, event).slots[0] === idx;
  const data: DragData = { type: 'event', eventId: event.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `event|${event.id}|${idx}`, data, disabled: !isStart });
  const count = participantsOf(state, event.id).length;
  const comments = state.event_comments.filter(c => c.event_id === event.id).length;
  const warn = alerts.some(a => a.kind === 'overlap' && a.eventIds.includes(event.id));
  return (
    <button
      ref={setNodeRef} {...listeners} {...attributes} type="button"
      className={`tile ${isStart ? '' : 'cont'} ${warn ? 'warn' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => openSheet({ kind: 'event', id: event.id })}
    >
      <strong className="tile-title">{rank && <span className="tile-rank">{rank}. </span>}{activity?.name ?? 'Activité'}{!isStart && <span className="muted"> (suite)</span>}</strong>
      <span className="tile-meta">
        {[durationLabel(event.duration), `${count} pers.`, event.place_name].filter(Boolean).join(' · ')}
      </span>
      {(event.links.length > 0 || comments > 0) && (
        <span className="tile-icons">
          {event.links.length > 0 && <span aria-label={`${event.links.length} lien(s)`}><Link2 size={14} /> {event.links.length}</span>}
          {comments > 0 && <span aria-label={`${comments} commentaire(s)`}><MessageCircle size={14} /> {comments}</span>}
        </span>
      )}
    </button>
  );
}
