import { useReadyTrip } from '../../data/TripContext';
import { membersOf } from '../../domain/teams';
import { usePlanning } from './PlanningContext';

export function TeamsBar() {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  return (
    <div className="teams-bar">
      {state.teams.filter(t => !t.is_default).map(t => (
        <button key={t.id} className="team-chip" style={{ background: t.color }} onClick={() => openSheet({ kind: 'team', id: t.id })}>
          {t.name} · {membersOf(state, t.id).length} pers.
        </button>
      ))}
      <button className="team-chip add" onClick={() => openSheet({ kind: 'team', id: null })}>+ Équipe</button>
    </div>
  );
}
