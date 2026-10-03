import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { slotIndex } from '../../domain/slots';
import { rosterAt, teamCovers } from '../../domain/teams';
import { teamIncludedNight } from '../../domain/conflicts';
import { BOAT_CATEGORY } from '../../domain/expenses';
import { formatEuros } from '../../lib/format';
import { usePlanning } from './PlanningContext';

export function NightCell({ team, night }: { team: Team; night: string }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const idx = slotIndex(state.trip, night, 'soir');
  if (!teamCovers(state, team, idx)) return <div className="night disabled" />;
  const included = teamIncludedNight(state, team.id, night);
  if (included) {
    const a = state.activities.find(x => x.id === included.activity_id);
    return <div className="night included">🌙 {a?.category === BOAT_CATEGORY ? 'À bord' : `Inclus : ${a?.name ?? ''}`}</div>;
  }
  const options = state.stays.filter(st => st.team_id === team.id && st.night_date === night);
  const chosen = options.find(o => o.chosen);
  const missing = !chosen && rosterAt(state, team.id, idx).length > 0;
  const price = chosen?.price != null ? ` · ${formatEuros(chosen.price)}${chosen.price_mode === 'per_person' ? '/pers.' : ''}` : '';
  const label = chosen
    ? `Nuit à ${chosen.place_name || 'logement'}${price}`
    : options.length ? `${options.length} option(s) de logement — à choisir` : '+ Logement';
  const link = chosen?.links[0];
  return (
    <div className={`night ${chosen ? '' : 'empty'} ${missing ? 'warn' : ''}`}>
      <button type="button" className="night-btn" onClick={() => openSheet({ kind: 'stay', teamId: team.id, night })}>🌙 {label}</button>
      {link && <a href={link.url} target="_blank" rel="noreferrer noopener" aria-label={`Voir le logement : ${link.label}`}>🔗</a>}
    </div>
  );
}
