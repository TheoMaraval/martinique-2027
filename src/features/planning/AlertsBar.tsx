import { useState } from 'react';
import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react';
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
        <TriangleAlert size={20} className="alerts-icon" />
        <span className="alerts-text">{conflicts.length} conflit(s) · {noStay.size} nuit(s) sans logement pour tout le monde</span>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && (
        <ul>
          {conflicts.map((a, i) => (
            <li key={i}>
              {a.kind === 'overlap' && `${name(a.personId)} : ${a.eventIds.slice(0, -1).map(actName).join(', ')} et ${actName(a.eventIds[a.eventIds.length - 1])} se chevauchent`}
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
