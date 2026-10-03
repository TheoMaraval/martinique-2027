import { useEffect, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { parsePrice } from '../../domain/validation';

export function ProfileCard() {
  const { state, me, actions } = useReadyTrip();
  const person = state.people.find(p => p.id === me)!;
  const [text, setText] = useState(person.budget_max == null ? '' : String(person.budget_max));
  const [error, setError] = useState('');
  useEffect(() => setText(person.budget_max == null ? '' : String(person.budget_max)), [person.budget_max]);
  const commit = () => {
    const p = parsePrice(text);
    if (p === 'invalid') return setError('Montant invalide');
    setError('');
    if (p !== person.budget_max) void actions.setBudget(person.id, p);
  };
  return (
    <section className="card profile">
      <h2>Mon profil — {person.name}</h2>
      <label className="field">
        <span className="field-label">Mon budget max (€)</span>
        <input inputMode="decimal" placeholder="ex. 1500" value={text} onChange={e => setText(e.target.value)} onBlur={commit} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">
        Ce budget couvre <strong>logements + bateau + grosses activités payantes</strong>. Il ne comprend pas les
        restaurants ni les sorties gratuites (randonnées, plages, pique-niques…).
      </p>
    </section>
  );
}
