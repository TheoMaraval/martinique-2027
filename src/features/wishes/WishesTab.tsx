import { useMemo, useState } from 'react';
import { Mountain, Music, Plus, Sailboat, Sparkles, Sun, Users, Waves, type LucideIcon } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import { popularity } from '../../domain/unplaced';
import { ProfileCard } from './ProfileCard';
import { ActivityCard } from './ActivityCard';
import { AddActivityForm } from './AddActivityForm';

const CATEGORY_ORDER = ['Bateau', 'Mer', 'Détente', 'Nature', 'Local'];
const CATEGORY_ICON: Record<string, LucideIcon> = { Bateau: Sailboat, Mer: Waves, Détente: Sun, Nature: Mountain, Local: Music };
const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);

export function WishesTab() {
  const { state } = useReadyTrip();
  const [adding, setAdding] = useState(false);
  const pop = useMemo(() => popularity(state), [state]);
  const byPop = (a: { id: string; name: string }, b: { id: string; name: string }) =>
    (pop.get(b.id) ?? 0) - (pop.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'fr');
  const categories = [...new Set(state.activities.map(a => a.category))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'fr'));
  const top = state.activities.filter(a => (pop.get(a.id) ?? 0) > 0).sort(byPop);
  return (
    <div className="wishes">
      <ProfileCard />
      <p className="info-banner">
        <Users size={20} className="info-icon" />
        <span>
          Coche ce qui te tente (et la formule pour le bateau). Selon les envies, <strong>on ne sera pas toujours tous ensemble</strong> :
          le planning prévoit des équipes en parallèle.
        </span>
      </p>
      {top.length > 0 && (
        <section className="card top">
          <h2>Top des envies</h2>
          <ol className="podium">
            {top.map((a, i) => (
              <li key={a.id}>
                <span className={`rank rank-${i + 1}`} aria-hidden="true">{i + 1}</span>
                <span className="podium-name">{a.name}</span>
                <span className="pop-badge" aria-label={`Suggérée par ${pop.get(a.id)} personne(s)`}>×{pop.get(a.id)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {categories.map(cat => {
        const Icon = CATEGORY_ICON[cat] ?? Sparkles;
        return (
          <section key={cat} className="category">
            <h2 className="category-title"><span className="category-icon"><Icon size={18} /></span>{cat}</h2>
            <div className="cards">
              {state.activities.filter(a => a.category === cat).sort(byPop).map(a => <ActivityCard key={a.id} activity={a} />)}
            </div>
          </section>
        );
      })}
      {adding ? (
        <AddActivityForm onDone={() => setAdding(false)} />
      ) : (
        <button className="primary wide" onClick={() => setAdding(true)}><Plus size={20} /> Ajouter une activité</button>
      )}
    </div>
  );
}
