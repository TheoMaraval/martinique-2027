import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Meal, MealKind } from '../../domain/types';
import { MEAL_LABEL } from '../../domain/itinerary';
import { formatDay } from '../../lib/format';
import { newId } from '../../lib/ids';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinksEditor } from '../../ui/Links';

/** Fiche « Déjeuner » / « Dîner » d'une équipe pour un jour. Pour info : jamais compté dans les dépenses. */
export function MealSheet({ teamId, date, kind, onClose }: { teamId: string; date: string; kind: MealKind; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const existing = state.meals.find(m => m.team_id === teamId && m.date === date && m.kind === kind);
  const [draft, setDraft] = useState<Meal>(() => existing ?? {
    id: newId(), trip_id: state.trip.id, team_id: teamId, date, kind, place_name: '',
    lat: null, lng: null, links: [], price: null, price_mode: 'total', notes: '',
  });
  const [priceOk, setPriceOk] = useState(true);
  const team = state.teams.find(t => t.id === teamId);
  const save = () => {
    void actions.saveMeal(draft);
    onClose();
  };
  const remove = () => {
    if (!existing || !confirm(`Supprimer ce ${MEAL_LABEL[kind].toLowerCase()} ?`)) return;
    void actions.deleteMeal(existing.id);
    onClose();
  };
  return (
    <Sheet title={`${MEAL_LABEL[kind]} · ${formatDay(date)}`} onClose={onClose}>
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
        {existing && <button className="danger" onClick={remove}>Supprimer</button>}
        <button onClick={onClose}>Annuler</button>
        <button className="primary" disabled={!priceOk} onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  );
}
