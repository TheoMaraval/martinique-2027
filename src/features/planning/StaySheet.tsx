import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Stay, TripState } from '../../domain/types';
import { slotIndex } from '../../domain/slots';
import { rosterAt } from '../../domain/teams';
import { formatDay, formatEuros } from '../../lib/format';
import { newId } from '../../lib/ids';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinkList, LinksEditor } from '../../ui/Links';

const emptyOption = (s: TripState, teamId: string, night: string): Stay => ({
  id: newId(), trip_id: s.trip.id, team_id: teamId, night_date: night, place_name: '',
  lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '', chosen: false,
});

export function StaySheet({ teamId, night, onClose }: { teamId: string; night: string; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const options = state.stays.filter(st => st.team_id === teamId && st.night_date === night);
  const [editing, setEditing] = useState<Stay | null>(() => (options.length ? null : emptyOption(state, teamId, night)));
  const [priceOk, setPriceOk] = useState(true);
  const team = state.teams.find(t => t.id === teamId);
  const roster = rosterAt(state, teamId, slotIndex(state.trip, night, 'soir'));
  const save = () => {
    if (!editing) return;
    void actions.saveStay(editing);
    setEditing(null);
  };
  return (
    <Sheet title={`Nuit du ${formatDay(night)}`} onClose={onClose}>
      <p className="muted">
        {team?.name} · {roster.length} pers. — Proposez plusieurs logements, puis retenez-en un : seul le logement
        retenu compte dans le road-book et les dépenses.
      </p>
      {options.length > 0 && (
        <ul className="stay-options">
          {options.map(o => (
            <li key={o.id} className={`stay-option ${o.chosen ? 'chosen' : ''}`}>
              <label className="check">
                <input type="radio" name="chosen-stay" checked={o.chosen} aria-label={`Retenir ${o.place_name || 'ce logement'}`}
                  onChange={() => void actions.chooseStay(o.id)} />
                <strong>{o.place_name || 'Logement sans nom'}</strong>
                {o.chosen && <span className="chip">Retenu</span>}
              </label>
              <span className="muted">
                {o.price != null ? `${formatEuros(o.price)}${o.price_mode === 'per_person' ? ' / pers.' : ' au total'}` : 'Prix non renseigné'}
              </span>
              <LinkList links={o.links} />
              {o.notes && <p className="muted">{o.notes}</p>}
              <div className="row">
                <button type="button" onClick={() => setEditing(o)}>Modifier</button>
                <button type="button" className="danger" onClick={() => { if (confirm('Supprimer cette option ?')) void actions.deleteStay(o.id); }}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <div className="card">
          <h3>{options.some(o => o.id === editing.id) ? "Modifier l'option" : 'Nouvelle option'}</h3>
          <Field label="Ville / logement">
            <PlaceField key={editing.id} value={{ place_name: editing.place_name, lat: editing.lat, lng: editing.lng }}
              onChange={v => setEditing(d => d && { ...d, ...v })} />
          </Field>
          <Field label="Prix">
            <PriceField key={editing.id} price={editing.price} mode={editing.price_mode} participants={roster.length} onValidity={setPriceOk}
              onChange={(price, price_mode) => setEditing(d => d && { ...d, price, price_mode })} />
          </Field>
          <Field label="Liens vers le logement">
            <LinksEditor links={editing.links} onChange={links => setEditing(d => d && { ...d, links })} />
          </Field>
          <Field label="Notes">
            <textarea aria-label="Notes" rows={2} value={editing.notes} onChange={e => setEditing(d => d && { ...d, notes: e.target.value })} />
          </Field>
          <div className="sheet-actions">
            <button type="button" onClick={() => setEditing(null)}>Annuler</button>
            <button type="button" className="primary" disabled={!priceOk} onClick={save}>Enregistrer l'option</button>
          </div>
        </div>
      ) : (
        <button className="wide" onClick={() => setEditing(emptyOption(state, teamId, night))}><Plus size={18} /> Proposer un logement</button>
      )}
    </Sheet>
  );
}
