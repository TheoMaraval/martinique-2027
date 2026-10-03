import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { durationLabel } from '../../domain/durations';
import { startOptions } from '../../domain/placement';
import { PART_LABEL, slotIndex } from '../../domain/slots';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { usePlanning } from './PlanningContext';

export function MoveSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { moveEvent } = usePlanning();
  const event = state.events.find(e => e.id === eventId);
  const optionsFor = (teamId: string) => (event ? startOptions(state, teamId, event.duration) : []);
  const [teamId, setTeamId] = useState(event?.team_id ?? '');
  const [idx, setIdx] = useState(() => {
    if (!event) return -1;
    const current = slotIndex(state.trip, event.start_date, event.start_part);
    const opts = optionsFor(event.team_id);
    return opts.some(o => o.index === current) ? current : opts[0]?.index ?? -1;
  });
  if (!event) return null;
  const activity = state.activities.find(a => a.id === event.activity_id);
  const options = optionsFor(teamId);
  const effectiveIdx = options.some(o => o.index === idx) ? idx : options[0]?.index ?? -1;
  return (
    <Sheet title={`Déplacer · ${activity?.name ?? 'Activité'} (${durationLabel(event.duration)})`} onClose={onClose}>
      <Field label="Équipe">
        <select aria-label="Équipe" value={teamId} onChange={e => { setTeamId(e.target.value); setIdx(optionsFor(e.target.value)[0]?.index ?? -1); }}>
          {state.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Créneau de départ">
        <select aria-label="Créneau" value={effectiveIdx} onChange={e => setIdx(Number(e.target.value))}>
          {options.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      <div className="sheet-actions">
        <button onClick={onClose}>Annuler</button>
        <button className="primary" disabled={effectiveIdx < 0} onClick={() => { moveEvent(event.id, teamId, effectiveIdx); onClose(); }}>Déplacer</button>
      </div>
    </Sheet>
  );
}
