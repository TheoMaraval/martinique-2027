import { Check, Trash2 } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Activity } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { firstName } from '../../lib/format';
import { newId } from '../../lib/ids';
import { LinkList } from '../../ui/Links';
import { Avatar } from '../../ui/Avatar';

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
        {activity.durations.map(d => {
          const mine = state.wishes.find(w => w.person_id === me && w.activity_id === activity.id && w.duration === d);
          const all = state.wishes.filter(w => w.activity_id === activity.id && w.duration === d);
          return (
            <li key={d}>
              <div className="duration-row">
                <label className={`pill-toggle ${mine ? 'on' : ''}`}>
                  <input
                    type="checkbox" checked={!!mine}
                    onChange={e => {
                      if (e.target.checked) {
                        void actions.saveWish({ id: newId(), trip_id: state.trip.id, person_id: me, activity_id: activity.id, duration: d, quantity: 1 });
                      } else if (mine) {
                        void actions.deleteWish(mine.id);
                      }
                    }}
                  />
                  {mine && <Check size={16} strokeWidth={2.5} />}
                  {durationLabel(d)}
                </label>
                {activity.has_quantity && mine && (
                  <label className="qty">
                    <span>Combien ?</span>
                    <select aria-label="Combien ?" value={mine.quantity} onChange={e => void actions.saveWish({ ...mine, quantity: Number(e.target.value) })}>
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
                      <span>{firstName(fullName(w.person_id))}{activity.has_quantity && w.quantity > 1 ? ` ×${w.quantity}` : ''}</span>
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
