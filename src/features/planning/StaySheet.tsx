import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Plus } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { Stay, TripState } from '../../domain/types';
import { slotIndex } from '../../domain/slots';
import { rosterAt } from '../../domain/teams';
import { formatDay, formatEuros } from '../../lib/format';
import { newId } from '../../lib/ids';
import { useAutosave } from '../../lib/useAutosave';
import { changedFields } from '../../lib/changedFields';
import { Sheet } from '../../ui/Sheet';
import { SaveStatus } from '../../ui/SaveStatus';
import { Field } from '../../ui/Field';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinkList, LinksEditor } from '../../ui/Links';

const emptyOption = (s: TripState, teamId: string, night: string): Stay => ({
  id: newId(), trip_id: s.trip.id, team_id: teamId, night_date: night, place_name: '',
  lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '', chosen: false,
});

/** Une nouvelle option n'est créée qu'avec un nom de lieu, un lien ou un prix. */
const worthCreating = (o: Stay) => !!o.place_name.trim() || o.links.length > 0 || o.price != null;

export function StaySheet({ teamId, night, onClose }: { teamId: string; night: string; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const options = state.stays.filter(st => st.team_id === teamId && st.night_date === night);
  const [editing, setEditing] = useState<Stay | null>(() => (options.length ? null : emptyOption(state, teamId, night)));
  const cancelEdit = useRef<(() => void) | null>(null);
  const team = state.teams.find(t => t.id === teamId);
  const roster = rosterAt(state, teamId, slotIndex(state.trip, night, 'soir'));
  const remove = (o: Stay) => {
    if (!confirm('Supprimer cette option ?')) return;
    // L'option en cours de modification ne doit pas être ré-enregistrée à la fermeture de l'éditeur.
    if (editing?.id === o.id) {
      cancelEdit.current?.();
      setEditing(null);
    }
    void actions.deleteStay(o.id);
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
                <button type="button" className="danger" onClick={() => remove(o)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <OptionEditor key={editing.id} initial={editing} participants={roster.length}
          cancelRef={cancelEdit} onDone={() => setEditing(null)} />
      ) : (
        <button className="wide" onClick={() => setEditing(emptyOption(state, teamId, night))}><Plus size={18} /> Proposer un logement</button>
      )}
      <div className="sheet-actions">
        <span />
        <button onClick={onClose}>Fermer</button>
      </div>
    </Sheet>
  );
}

/**
 * Éditeur d'une option, enregistré automatiquement : une nouvelle option est créée au premier
 * enregistrement utile (lieu, lien ou prix), puis seuls les champs modifiés sont appliqués sur la version
 * actuelle (synchro temps réel). Changer d'option ou fermer enregistre. Supprimée ailleurs : plus rien n'est enregistré.
 */
function OptionEditor({ initial, participants, cancelRef, onDone }: {
  initial: Stay; participants: number;
  cancelRef: MutableRefObject<(() => void) | null>; onDone: () => void;
}) {
  const { state, actions } = useReadyTrip();
  const row = state.stays.find(st => st.id === initial.id);
  const [draft, setDraft] = useState(initial);
  const [created, setCreated] = useState(false);
  // L'option a existé dans l'état partagé (à l'ouverture ou après notre création) puis a disparu : supprimée ailleurs.
  const [seen, setSeen] = useState(!!row);
  useEffect(() => { if (row && !seen) setSeen(true); }, [row, seen]);
  const deleted = seen && !row;
  const isNew = !row && !seen;
  const autosave = useAutosave(draft, (next, prev) => {
    setCreated(true);
    return actions.saveStay({ ...(row ?? next), ...changedFields(next, prev) });
  }, { enabled: !deleted && (!!row || created || worthCreating(draft)) });
  useEffect(() => { cancelRef.current = autosave.cancel; });
  return (
    <div className="card">
      <div className="editor-head">
        <h3>{isNew && !created ? 'Nouvelle option' : "Modifier l'option"}</h3>
        <SaveStatus status={autosave.status} deleted={deleted} />
      </div>
      <Field label="Ville / logement">
        <PlaceField value={{ place_name: draft.place_name, lat: draft.lat, lng: draft.lng }}
          onChange={v => setDraft(d => ({ ...d, ...v }))} />
      </Field>
      <Field label="Prix">
        <PriceField price={draft.price} mode={draft.price_mode} participants={participants}
          onChange={(price, price_mode) => setDraft(d => ({ ...d, price, price_mode }))} />
      </Field>
      <Field label="Liens vers le logement">
        <LinksEditor links={draft.links} onChange={links => setDraft(d => ({ ...d, links }))} />
      </Field>
      <Field label="Notes">
        <textarea aria-label="Notes" rows={2} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </Field>
      <div className="row">
        <button type="button" onClick={onDone}>Terminé</button>
      </div>
    </div>
  );
}
