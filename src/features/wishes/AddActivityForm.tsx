import { useState, type FormEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Link } from '../../domain/types';
import { compareDurations, durationLabel, multiKey } from '../../domain/durations';
import { newId } from '../../lib/ids';
import { LinksEditor } from '../../ui/Links';
import { Field } from '../../ui/Field';

const BASE_DURATIONS = ['half', 'day', 'evening'];
const NEW_CATEGORY = '__new';

export function AddActivityForm({ onDone }: { onDone: () => void }) {
  const { state, me, actions } = useReadyTrip();
  const categories = [...new Set(state.activities.map(a => a.category))];
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState('');
  const [durations, setDurations] = useState<string[]>([]);
  const [days, setDays] = useState(2);
  const [nights, setNights] = useState(1);
  const [hasQuantity, setHasQuantity] = useState(false);
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const [error, setError] = useState('');

  const toggle = (k: string) => setDurations(d => (d.includes(k) ? d.filter(x => x !== k) : [...d, k]));
  const addMulti = () => {
    if (days < 1 || nights < 0 || nights > days) return setError('Multi-jours : nuits entre 0 et le nombre de jours');
    setError('');
    const k = multiKey(days, nights);
    if (!durations.includes(k)) setDurations([...durations, k]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typed = newCategory.trim();
    const cat = category === NEW_CATEGORY
      ? (categories.find(c => c.toLowerCase() === typed.toLowerCase()) ?? typed)
      : category;
    if (!name.trim()) return setError("Donne un nom à l'activité");
    if (!cat) return setError('Choisis une catégorie');
    if (!durations.length) return setError('Choisis au moins une durée (pour un multi-jours, clique « + Multi-jours »)');
    const activityId = newId();
    const sorted = [...durations].sort(compareDurations);
    void actions.saveActivity(
      {
        id: activityId, trip_id: state.trip.id, name: name.trim(), category: cat, durations: sorted,
        has_quantity: hasQuantity, description: description.trim(), links, is_custom: true, created_by: me,
      },
      // La suggestion compte comme une envie de son créateur (première durée, ×1).
      { id: newId(), trip_id: state.trip.id, person_id: me, activity_id: activityId, duration: sorted[0], quantity: 1 },
    );
    onDone();
  };

  return (
    <form className="card add-activity" onSubmit={submit}>
      <h2>Nouvelle activité</h2>
      <Field label="Nom">
        <input aria-label="Nom de l'activité" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Catégorie">
        <select aria-label="Catégorie" value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={NEW_CATEGORY}>Nouvelle catégorie…</option>
        </select>
        {category === NEW_CATEGORY && (
          <input aria-label="Nom de la nouvelle catégorie" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
        )}
      </Field>
      <Field label="Durées possibles">
        <div className="pill-group">
          {BASE_DURATIONS.map(k => (
            <label key={k} className={`pill-toggle ${durations.includes(k) ? 'on' : ''}`}>
              <input type="checkbox" checked={durations.includes(k)} onChange={() => toggle(k)} />
              {durations.includes(k) && <Check size={16} strokeWidth={2.5} />}
              {durationLabel(k)}
            </label>
          ))}
        </div>
        <div className="row multi-row">
          <input aria-label="Nombre de jours" type="number" min={1} max={10} value={days} onChange={e => setDays(Number(e.target.value))} />
          <span>jours</span>
          <input aria-label="Nombre de nuits" type="number" min={0} max={10} value={nights} onChange={e => setNights(Number(e.target.value))} />
          <span>nuits</span>
          <button type="button" onClick={addMulti}><Plus size={18} /> Multi-jours</button>
        </div>
        {durations.filter(d => d.startsWith('multi:')).map(d => (
          <span key={d} className="chip">
            {durationLabel(d)}{' '}
            <button type="button" className="icon-btn" aria-label={`Retirer ${durationLabel(d)}`} onClick={() => toggle(d)}><X size={16} /></button>
          </span>
        ))}
      </Field>
      <label className="check">
        <input type="checkbox" checked={hasQuantity} onChange={e => setHasQuantity(e.target.checked)} />
        On peut en vouloir plusieurs (ex. randonnées)
      </label>
      <Field label="Description">
        <textarea aria-label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={links} onChange={setLinks} />
      </Field>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" onClick={onDone}>Annuler</button>
        <button type="submit" className="primary">Ajouter l'activité</button>
      </div>
    </form>
  );
}
