import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import { parsePrice } from '../../domain/validation';
import { useAutosave } from '../../lib/useAutosave';
import { Avatar } from '../../ui/Avatar';

export function ProfileCard() {
  const { state, me, actions } = useReadyTrip();
  const person = state.people.find(p => p.id === me)!;
  const [text, setText] = useState(person.budget_max == null ? '' : String(person.budget_max));
  const [error, setError] = useState('');
  // Valeur changée ailleurs : on la reprend, sans reformater ce qui est en cours de saisie (« 1500,5 »).
  useEffect(() => setText(t => (parsePrice(t) === person.budget_max ? t : person.budget_max == null ? '' : String(person.budget_max))), [person.budget_max]);
  // Enregistré pendant la saisie (après 600 ms sans frappe, montants valides seulement) et à la sortie du champ.
  const autosave = useAutosave(text, next => {
    const p = parsePrice(next);
    if (p !== 'invalid' && p !== person.budget_max) return actions.setBudget(person.id, p);
  }, { enabled: parsePrice(text) !== 'invalid' });
  const commit = () => {
    if (parsePrice(text) === 'invalid') return setError('Montant invalide');
    setError('');
    autosave.flush();
  };
  return (
    <section className="card profile">
      <div className="profile-head">
        <Avatar name={person.name} size="lg" />
        <h2>Mon profil — {person.name}</h2>
      </div>
      <label className="field budget-field">
        <span className="field-label"><Wallet size={16} /> Mon budget max (€)</span>
        <span className="budget-input">
          <input inputMode="decimal" placeholder="ex. 1500" value={text} onChange={e => { setText(e.target.value); if (error && parsePrice(e.target.value) !== 'invalid') setError(''); }} onBlur={commit} />
          <span className="budget-unit" aria-hidden="true">€</span>
        </span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">
        Ce budget couvre <strong>logements + bateau + grosses activités payantes</strong>. Il ne comprend pas les
        restaurants ni les sorties gratuites (randonnées, plages, pique-niques…).
      </p>
    </section>
  );
}
