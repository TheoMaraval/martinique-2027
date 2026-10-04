import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { PART_LABEL, SLOT_CAPACITY, buildSlots, slotIndex } from '../../domain/slots';
import { teamCovers } from '../../domain/teams';
import { eventSpan } from '../../domain/conflicts';
import { usePlanning, type DropData } from './PlanningContext';
import { EventTile } from './EventTile';

export function SlotCell({ team, idx }: { team: Team; idx: number }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const slot = buildSlots(state.trip)[idx];
  const enabled = slot.plannable && teamCovers(state, team, idx);
  const data: DropData = { teamId: team.id, idx };
  const { setNodeRef, isOver } = useDroppable({ id: `cell|${team.id}|${idx}`, data, disabled: !enabled });
  // Ordre d'affichage : début, puis id (stable) ; numérotées « 1. » / « 2. » quand le créneau en a plusieurs.
  const start = (e: (typeof state.events)[number]) => slotIndex(state.trip, e.start_date, e.start_part);
  const events = state.events
    .filter(e => e.team_id === team.id && eventSpan(state, e).slots.includes(idx))
    .sort((a, b) => start(a) - start(b) || a.id.localeCompare(b.id));
  const full = events.length >= SLOT_CAPACITY[slot.part];
  return (
    <div ref={setNodeRef} className={`slot slot-${slot.part} ${enabled ? '' : 'disabled'} ${isOver ? 'over' : ''}`}>
      <span className="slot-label">{PART_LABEL[slot.part]}</span>
      {!slot.plannable && <span className="muted">{slot.blockedLabel}</span>}
      {events.map((e, i) => <EventTile key={e.id} event={e} idx={idx} rank={events.length > 1 ? i + 1 : undefined} />)}
      {enabled && !full && (
        <button className="add-btn" aria-label={`Ajouter une activité (${PART_LABEL[slot.part]})`} onClick={() => openSheet({ kind: 'quick', teamId: team.id, idx })}><Plus size={18} /></button>
      )}
    </div>
  );
}
