import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { isFlex } from '../../domain/durations';
import { eventSpan, participantsOf } from '../../domain/conflicts';
import { nextOccurrence, resizeOptions, resizedEvent } from '../../domain/placement';
import { PART_LABEL, buildSlots } from '../../domain/slots';
import { withFormula } from '../../lib/labels';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PeoplePicker } from '../../ui/PeoplePicker';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinksEditor } from '../../ui/Links';
import { CommentsThread } from './CommentsThread';
import { usePlanning } from './PlanningContext';

export function EventSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const { openSheet } = usePlanning();
  const event = state.events.find(e => e.id === eventId);
  const [initial] = useState(event);
  const [draft, setDraft] = useState(event);
  const [peopleTouched, setPeopleTouched] = useState(false);
  const [people, setPeople] = useState(() => participantsOf(state, eventId));
  const [priceOk, setPriceOk] = useState(true);
  if (!event || !draft) return null;
  const activity = state.activities.find(a => a.id === event.activity_id);
  const team = state.teams.find(t => t.id === event.team_id);
  // On n'applique que les champs réellement modifiés, par-dessus la dernière version (synchro temps réel).
  const FIELDS = ['place_name', 'lat', 'lng', 'price', 'price_mode', 'links', 'notes'] as const;
  const patch: Partial<typeof draft> = {};
  if (initial) for (const k of FIELDS) if (JSON.stringify(draft[k]) !== JSON.stringify(initial[k])) Object.assign(patch, { [k]: draft[k] });
  const edited = { ...event, ...patch };
  const participants = peopleTouched ? people : undefined;
  const dirty = Object.keys(patch).length > 0 || peopleTouched;
  const flush = () => { if (dirty && priceOk) void actions.saveEvent(edited, participants); };
  const save = () => {
    void actions.saveEvent(edited, participants);
    onClose();
  };
  const remove = () => {
    if (!confirm('Retirer cette activité du planning ? Elle reviendra dans « À placer ».')) return;
    void actions.deleteEvent(event.id);
    onClose();
  };
  // Une même activité peut être placée plusieurs fois : nouvelle occurrence, mêmes participants proposés.
  const placeAgain = () => {
    if (!activity) return;
    flush();
    openSheet({
      kind: 'place',
      item: { key: '', activity, duration: event.duration, occurrence: nextOccurrence(state, activity.id, event.duration), total: 1, personIds: people },
    });
  };
  return (
    <Sheet title={withFormula(activity?.name ?? 'Activité', event.duration)} onClose={onClose}>
      <p className="muted">{team?.name} · {formatDay(event.start_date)} · {PART_LABEL[event.start_part]}</p>
      {isFlex(event.duration) && <ResizeField eventId={event.id} />}
      <Field label={`Participants (${people.length})`}>
        <PeoplePicker people={state.people} selected={people} onChange={ids => { setPeople(ids); setPeopleTouched(true); }} />
      </Field>
      <Field label="Lieu">
        <PlaceField value={{ place_name: draft.place_name, lat: draft.lat, lng: draft.lng }} onChange={v => setDraft(d => d && { ...d, ...v })} />
      </Field>
      <Field label="Budget (optionnel)">
        <PriceField price={draft.price} mode={draft.price_mode} participants={people.length} onValidity={setPriceOk}
          onChange={(price, price_mode) => setDraft(d => d && { ...d, price, price_mode })} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={draft.links} onChange={links => setDraft(d => d && { ...d, links })} />
      </Field>
      <Field label="Notes">
        <textarea aria-label="Notes" rows={3} value={draft.notes} onChange={e => setDraft(d => d && { ...d, notes: e.target.value })} />
      </Field>
      <div className="sheet-actions">
        <button className="danger" onClick={remove}>Retirer</button>
        <button onClick={() => { flush(); openSheet({ kind: 'move', eventId: event.id }); }}>Déplacer…</button>
        <button onClick={placeAgain}>Placer à nouveau</button>
        <button className="primary" disabled={!priceOk} onClick={save}>Enregistrer</button>
      </div>
      <Field label="Commentaires">
        <CommentsThread eventId={event.id} />
      </Field>
    </Sheet>
  );
}

/** « Horaire » d'une activité simple : du créneau de début jusqu'à un créneau de fin (inclus). */
function ResizeField({ eventId }: { eventId: string }) {
  const { state, actions } = useReadyTrip();
  const event = state.events.find(e => e.id === eventId)!;
  const slots = buildSlots(state.trip);
  const span = eventSpan(state, event).slots;
  const start = span[0];
  const end = span[span.length - 1];
  if (start == null) return null;
  const options = resizeOptions(state, eventId);
  // La fin actuelle reste proposée même si elle n'est plus valide (ex. capacité dépassée par ailleurs).
  const choices = options.some(o => o.index === end) ? options : [...options, slots[end]].sort((a, b) => a.index - b.index);
  const pos = choices.findIndex(o => o.index === end);
  const next = options.find(o => o.index > end);
  const prev = [...options].reverse().find(o => o.index < end);
  const resize = (idx: number) => {
    const e = resizedEvent(state, eventId, idx);
    if (e) void actions.saveEvent(e);
  };
  const label = (i: number) => `${formatDay(slots[i].date)} · ${PART_LABEL[slots[i].part]}`;
  return (
    <Field label="Horaire">
      <p className="resize-from">De : {label(start)}</p>
      <label className="resize-to">
        <span>Jusqu'à</span>
        <select aria-label="Jusqu'à" value={end} onChange={e => resize(Number(e.target.value))}>
          {choices.map(o => <option key={o.index} value={o.index}>{label(o.index)}</option>)}
        </select>
      </label>
      <div className="row resize-actions">
        <button type="button" disabled={!prev || pos <= 0} onClick={() => prev && resize(prev.index)}>Réduire d'un créneau</button>
        <button type="button" disabled={!next} onClick={() => next && resize(next.index)}>Étendre d'un créneau</button>
      </div>
    </Field>
  );
}
