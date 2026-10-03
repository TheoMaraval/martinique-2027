import { useReadyTrip } from '../../data/TripContext';
import type { DayPlan } from '../../domain/itinerary';
import { durationLabel } from '../../domain/durations';
import { participantsOf } from '../../domain/conflicts';
import { BOAT_CATEGORY } from '../../domain/expenses';
import { PART_LABEL } from '../../domain/slots';
import { firstName, formatDay, formatEuros } from '../../lib/format';
import { LinkList } from '../../ui/Links';

export function DayRecap({ days }: { days: DayPlan[] }) {
  const { state } = useReadyTrip();
  const name = (id: string) => firstName(state.people.find(p => p.id === id)?.name ?? '?');
  const activity = (id: string) => state.activities.find(a => a.id === id);
  return (
    <section className="day-recap">
      {days.map(d => (
        <article key={d.date} className="card recap-day">
          <h3>{formatDay(d.date)}</h3>
          {d.entries.length === 0 && <p className="muted">Rien de prévu.</p>}
          {d.entries.map(en => (
            <div key={en.team.id} className="recap-team" style={{ borderColor: en.team.color }}>
              <h4>{en.team.name}</h4>
              <ul>
                {en.events.map(e => (
                  <li key={e.id}>
                    <span className="muted">{e.start_date === d.date ? PART_LABEL[e.start_part] : 'Suite'}</span>{' '}
                    <strong>{activity(e.activity_id)?.name}</strong> · {durationLabel(e.duration)}
                    {e.place_name && ` · 📍 ${e.place_name}`}
                    <div className="muted">{participantsOf(state, e.id).map(name).join(', ')}</div>
                    <LinkList links={e.links} />
                  </li>
                ))}
              </ul>
              {en.includedBy && (
                <p>🌙 {activity(en.includedBy.activity_id)?.category === BOAT_CATEGORY ? 'Nuit à bord' : `Nuit incluse (${activity(en.includedBy.activity_id)?.name})`}</p>
              )}
              {en.stay && (
                <div>
                  <p>
                    🌙 Nuit à {en.stay.place_name || 'logement'}
                    {en.stay.price != null && ` · ${formatEuros(en.stay.price)}${en.stay.price_mode === 'per_person' ? '/pers.' : ''}`}
                  </p>
                  <LinkList links={en.stay.links} />
                </div>
              )}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
