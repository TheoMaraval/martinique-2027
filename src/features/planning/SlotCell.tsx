import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { PART_LABEL, buildSlots } from '../../domain/slots';
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
  const events = state.events.filter(e => e.team_id === team.id && eventSpan(state, e).slots.includes(idx));
  return (
    <div ref={setNodeRef} className={`slot ${enabled ? '' : 'disabled'} ${isOver ? 'over' : ''}`}>
      <span className="slot-label">{PART_LABEL[slot.part]}</span>
      {!slot.plannable && <span className="muted">{slot.blockedLabel}</span>}
      {events.map(e => <EventTile key={e.id} event={e} idx={idx} />)}
      {enabled && (
        <button className="add-btn" aria-label={`Ajouter une activité (${PART_LABEL[slot.part]})`} onClick={() => openSheet({ kind: 'quick', teamId: team.id, idx })}><Plus size={18} /></button>
      )}
    </div>
  );
}
