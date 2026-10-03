import { useMemo, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { popularity } from '../../domain/unplaced';
import { ProfileCard } from './ProfileCard';
import { ActivityCard } from './ActivityCard';
import { AddActivityForm } from './AddActivityForm';

const CATEGORY_ORDER = ['Bateau', 'Mer', 'Détente', 'Nature', 'Local'];
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
        Coche ce qui te tente et la durée. Selon les envies, <strong>on ne sera pas toujours tous ensemble</strong> :
        le planning prévoit des équipes en parallèle.
      </p>
      {top.length > 0 && (
        <section className="card top">
          <h2>Top des envies</h2>
          <ol>
            {top.map(a => (
              <li key={a.id}>{a.name} <span className="pop-badge" aria-label={`Suggérée par ${pop.get(a.id)} personne(s)`}>×{pop.get(a.id)}</span></li>
            ))}
          </ol>
        </section>
      )}
      {categories.map(cat => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="cards">
            {state.activities.filter(a => a.category === cat).sort(byPop).map(a => <ActivityCard key={a.id} activity={a} />)}
          </div>
        </section>
      ))}
      {adding ? (
        <AddActivityForm onDone={() => setAdding(false)} />
      ) : (
        <button className="primary wide" onClick={() => setAdding(true)}>+ Ajouter une activité</button>
      )}
    </div>
  );
}
