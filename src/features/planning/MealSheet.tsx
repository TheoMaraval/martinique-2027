import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Meal, MealKind } from '../../domain/types';
import { MEAL_LABEL } from '../../domain/itinerary';
import { formatDay } from '../../lib/format';
import { newId } from '../../lib/ids';
import { useAutosave } from '../../lib/useAutosave';
import { Sheet } from '../../ui/Sheet';
import { SaveStatus } from '../../ui/SaveStatus';
import { Field } from '../../ui/Field';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinksEditor } from '../../ui/Links';

/** Un repas qui mérite d'être créé : au moins un champ renseigné. */
const hasContent = (m: Meal) =>
  !!m.place_name.trim() || m.lat != null || m.links.length > 0 || m.price != null || !!m.notes.trim();

/**
 * Fiche « Déjeuner » / « Dîner » d'une équipe pour un jour. Pour info : jamais compté dans les dépenses.
 * Enregistrement automatique : le repas est créé dès qu'un champ est rempli, puis mis à jour.
 */
export function MealSheet({ teamId, date, kind, onClose }: { teamId: string; date: string; kind: MealKind; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const existing = state.meals.find(m => m.team_id === teamId && m.date === date && m.kind === kind);
  const [draft, setDraft] = useState<Meal>(() => existing ?? {
    id: newId(), trip_id: state.trip.id, team_id: teamId, date, kind, place_name: '',
    lat: null, lng: null, links: [], price: null, price_mode: 'total', notes: '',
  });
  const [priceOk, setPriceOk] = useState(true);
  const [created, setCreated] = useState(false);
  const autosave = useAutosave(draft, next => {
    setCreated(true);
    return actions.saveMeal(next);
  }, { enabled: priceOk && (!!existing || created || hasContent(draft)) });
  const team = state.teams.find(t => t.id === teamId);
  const remove = () => {
    if (!existing || !confirm(`Supprimer ce ${MEAL_LABEL[kind].toLowerCase()} ?`)) return;
    autosave.cancel();
    void actions.deleteMeal(existing.id);
    onClose();
  };
  return (
    <Sheet title={`${MEAL_LABEL[kind]} · ${formatDay(date)}`} onClose={onClose} status={<SaveStatus status={autosave.status} />}>
      <p className="muted">{team?.name} — où mange-t-on ? Pour info : les repas ne comptent pas dans les dépenses.</p>
      <Field label="Lieu">
        <PlaceField value={{ place_name: draft.place_name, lat: draft.lat, lng: draft.lng }} onChange={v => setDraft(d => ({ ...d, ...v }))} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={draft.links} onChange={links => setDraft(d => ({ ...d, links }))} />
      </Field>
      <Field label="Prix (pour info, hors budget)">
        <PriceField price={draft.price} mode={draft.price_mode} onValidity={setPriceOk}
          onChange={(price, price_mode) => setDraft(d => ({ ...d, price, price_mode }))} />
      </Field>
      <Field label="Notes">
        <textarea aria-label="Notes" rows={2} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </Field>
      <div className="sheet-actions">
        {existing ? <button className="danger" onClick={remove}>Supprimer</button> : <span />}
        <button onClick={onClose}>Fermer</button>
      </div>
    </Sheet>
  );
}
