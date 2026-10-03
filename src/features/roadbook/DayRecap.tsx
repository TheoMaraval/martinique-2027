import type { CSSProperties } from 'react';
import { MapPin, Moon, Ship } from 'lucide-react';
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
          <h3><span className="date-pill">{formatDay(d.date)}</span></h3>
          {d.entries.length === 0 && <p className="muted">Rien de prévu.</p>}
          {d.entries.map(en => {
            const boatNight = en.includedBy && activity(en.includedBy.activity_id)?.category === BOAT_CATEGORY;
            return (
              <div key={en.team.id} className="recap-team" style={{ '--team': en.team.color } as CSSProperties}>
                <h4><span className="team-pill">{en.team.name}</span></h4>
                <ul className="timeline">
                  {en.events.map(e => (
                    <li key={e.id}>
                      <span className="timeline-when">{e.start_date === d.date ? PART_LABEL[e.start_part] : 'Suite'}</span>
                      <div>
                        <strong>{activity(e.activity_id)?.name}</strong> <span className="muted">· {durationLabel(e.duration)}</span>
                      </div>
                      {e.place_name && <div className="recap-place"><MapPin size={14} /> {e.place_name}</div>}
                      <div className="muted">{participantsOf(state, e.id).map(name).join(', ')}</div>
                      <LinkList links={e.links} />
                    </li>
                  ))}
                </ul>
                {en.includedBy && (
                  <p className="recap-night">
                    {boatNight ? <Ship size={16} /> : <Moon size={16} />}
                    {boatNight ? 'Nuit à bord' : `Nuit incluse (${activity(en.includedBy.activity_id)?.name})`}
                  </p>
                )}
                {en.stay && (
                  <div>
                    <p className="recap-night">
                      <Moon size={16} />
                      <span>
                        Nuit à {en.stay.place_name || 'logement'}
                        {en.stay.price != null && ` · ${formatEuros(en.stay.price)}${en.stay.price_mode === 'per_person' ? '/pers.' : ''}`}
                      </span>
                    </p>
                    <LinkList links={en.stay.links} />
                  </div>
                )}
              </div>
            );
          })}
        </article>
      ))}
    </section>
  );
}
