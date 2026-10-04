import { Check, Trash2 } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Activity, DurationKey, Wish } from '../../domain/types';
import { FLEX, allowsQuantity, canonicalDuration, durationLabel, isFlex } from '../../domain/durations';
import { firstName } from '../../lib/format';
import { newId } from '../../lib/ids';
import { LinkList } from '../../ui/Links';
import { Avatar } from '../../ui/Avatar';

interface Choice { key: DurationKey; label: string; matches: (w: Wish) => boolean }

/** Activité simple : une seule pilule « Ça me tente » ; séjour multi-jours : une pilule par formule. */
function choicesOf(activity: Activity): Choice[] {
  const keys = [...new Set(activity.durations.map(canonicalDuration))];
  return keys.map(key => (key === FLEX
    ? { key, label: 'Ça me tente', matches: (w: Wish) => isFlex(w.duration) }
    : { key, label: durationLabel(key), matches: (w: Wish) => w.duration === key }));
}

/** Une envie par personne (la plus grande quantité). */
function onePerPerson(ws: Wish[]): Wish[] {
  const by = new Map<string, Wish>();
  for (const w of ws) {
    const prev = by.get(w.person_id);
    if (!prev || w.quantity > prev.quantity) by.set(w.person_id, w);
  }
  return [...by.values()];
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const { state, me, actions } = useReadyTrip();
  const fullName = (id: string) => state.people.find(p => p.id === id)?.name ?? '?';
  const canDelete = activity.is_custom && activity.created_by === me && !state.events.some(e => e.activity_id === activity.id);
  const pop = new Set(state.wishes.filter(w => w.activity_id === activity.id).map(w => w.person_id)).size;
  return (
    <article className="card activity-card">
      <header>
        <h3>{activity.name}</h3>
        <div className="activity-card-tools">
          {pop > 0 && <span className="pop-badge" aria-label={`Suggérée par ${pop} personne(s)`}>×{pop}</span>}
          {canDelete && (
            <button
              className="icon-btn" aria-label={`Supprimer ${activity.name}`}
              onClick={() => { if (confirm(`Supprimer « ${activity.name} » du catalogue ?`)) void actions.deleteActivity(activity.id); }}
            ><Trash2 size={18} /></button>
          )}
        </div>
      </header>
      {activity.description && <p className="muted">{activity.description}</p>}
      <LinkList links={activity.links} />
      <ul className="durations">
        {choicesOf(activity).map(({ key: d, label, matches }) => {
          const mineAll = state.wishes.filter(w => w.person_id === me && w.activity_id === activity.id && matches(w));
          const mine = onePerPerson(mineAll)[0];
          const all = onePerPerson(state.wishes.filter(w => w.activity_id === activity.id && matches(w)));
          return (
            <li key={d}>
              <div className="duration-row">
                <label className={`pill-toggle ${mine ? 'on' : ''}`}>
                  <input
                    type="checkbox" checked={!!mine}
                    onChange={e => {
                      if (e.target.checked) {
                        void actions.saveWish({ id: newId(), trip_id: state.trip.id, person_id: me, activity_id: activity.id, duration: d, quantity: 1 });
                      } else {
                        for (const w of mineAll) void actions.deleteWish(w.id);
                      }
                    }}
                  />
                  {mine && <Check size={16} strokeWidth={2.5} />}
                  {label}
                </label>
                {allowsQuantity(d) && mine && (
                  <label className="qty">
                    <span>Combien de fois ?</span>
                    <select aria-label="Combien de fois ?" value={mine.quantity} onChange={e => void actions.saveWish({ ...mine, quantity: Number(e.target.value) })}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {all.length > 0 && (
                <div className="chips">
                  {all.map(w => (
                    <span key={w.id} className="chip person-chip">
                      <Avatar name={fullName(w.person_id)} size="xs" />
                      <span>{firstName(fullName(w.person_id))}{w.quantity > 1 ? ` ×${w.quantity}` : ''}</span>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
