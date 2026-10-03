import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { firstName, formatDay } from '../../lib/format';
import { usePlanning } from './PlanningContext';

export function AlertsBar() {
  const { state } = useReadyTrip();
  const { alerts } = usePlanning();
  const [open, setOpen] = useState(false);
  if (!alerts.length) return null;
  const name = (id: string) => firstName(state.people.find(p => p.id === id)?.name ?? '?');
  const actName = (eventId: string) => {
    const e = state.events.find(x => x.id === eventId);
    return state.activities.find(a => a.id === e?.activity_id)?.name ?? '?';
  };
  const teamName = (id: string) => state.teams.find(t => t.id === id)?.name ?? '?';
  const conflicts = alerts.filter(a => a.kind !== 'no-stay');
  const noStay = new Map<string, string[]>();
  for (const a of alerts) if (a.kind === 'no-stay') noStay.set(a.night, [...(noStay.get(a.night) ?? []), a.personId]);
  return (
    <section className="alerts">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}>
        ⚠️ {conflicts.length} conflit(s) · {noStay.size} nuit(s) sans logement pour tout le monde {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {conflicts.map((a, i) => (
            <li key={i}>
              {a.kind === 'overlap' && `${name(a.personId)} : ${actName(a.eventIds[0])} et ${actName(a.eventIds[1])} se chevauchent`}
              {a.kind === 'two-teams' && `${name(a.personId)} est dans ${teamName(a.teamIds[0])} et ${teamName(a.teamIds[1])} en même temps`}
            </li>
          ))}
          {[...noStay].map(([night, ids]) => (
            <li key={night}>Nuit du {formatDay(night)} : {ids.length === state.people.length ? 'personne n’a de logement' : ids.map(name).join(', ')}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
