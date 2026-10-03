import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { UnplacedItem } from '../../domain/unplaced';
import { durationLabel } from '../../domain/durations';
import { PART_LABEL, buildSlots } from '../../domain/slots';
import { defaultTeam } from '../../domain/teams';
import { canDrop } from '../../domain/placement';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { usePlanning } from './PlanningContext';

export function PlaceSheet({ item, onClose }: { item: UnplacedItem; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { place } = usePlanning();
  const optionsFor = (teamId: string) =>
    buildSlots(state.trip).filter(s => canDrop(state, teamId, s.index, item.duration));
  const [teamId, setTeamId] = useState(defaultTeam(state).id);
  const [idx, setIdx] = useState(() => optionsFor(defaultTeam(state).id)[0]?.index ?? -1);
  const options = optionsFor(teamId);
  return (
    <Sheet title={`Placer · ${item.activity.name} (${durationLabel(item.duration)})`} onClose={onClose}>
      <Field label="Équipe">
        <select aria-label="Équipe" value={teamId} onChange={e => { setTeamId(e.target.value); setIdx(optionsFor(e.target.value)[0]?.index ?? -1); }}>
          {state.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Créneau de départ">
        <select aria-label="Créneau" value={idx} onChange={e => setIdx(Number(e.target.value))}>
          {options.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      <div className="sheet-actions">
        <button onClick={onClose}>Annuler</button>
        <button className="primary" disabled={idx < 0} onClick={() => { place(item, teamId, idx); onClose(); }}>Placer</button>
      </div>
    </Sheet>
  );
}
