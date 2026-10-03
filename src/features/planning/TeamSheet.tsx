import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { PART_LABEL, buildSlots, slotAt, slotIndex } from '../../domain/slots';
import { membersOf } from '../../domain/teams';
import { eventsOutsideTeam } from '../../domain/placement';
import { formatDay } from '../../lib/format';
import { newId } from '../../lib/ids';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PeoplePicker } from '../../ui/PeoplePicker';

export const TEAM_COLORS = ['#D9472B', '#6D28D9', '#15803D', '#B45309', '#BE185D', '#1D4ED8'];

export function TeamSheet({ teamId, onClose }: { teamId: string | null; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const existing = teamId ? state.teams.find(t => t.id === teamId) : undefined;
  const plannable = buildSlots(state.trip).filter(s => s.plannable);
  const [draft, setDraft] = useState<Team>(() => existing ?? {
    id: newId(), trip_id: state.trip.id, name: `Équipe ${state.teams.length + 1}`,
    color: TEAM_COLORS[(state.teams.length - 1) % TEAM_COLORS.length],
    start_date: plannable[0].date, start_part: plannable[0].part,
    end_date: plannable[plannable.length - 1].date, end_part: plannable[plannable.length - 1].part, is_default: false,
  });
  const [memberIds, setMemberIds] = useState<string[]>(() => (existing ? membersOf(state, existing.id) : []));
  const start = slotIndex(state.trip, draft.start_date, draft.start_part);
  const end = slotIndex(state.trip, draft.end_date, draft.end_part);
  const valid = draft.name.trim() !== '' && start <= end;
  const setBound = (which: 'start' | 'end', idx: number) => {
    const { date, part } = slotAt(state.trip, idx);
    setDraft(d => (which === 'start' ? { ...d, start_date: date, start_part: part } : { ...d, end_date: date, end_part: part }));
  };
  const remove = () => {
    if (!existing || !confirm('Supprimer cette équipe ? Ses activités et logements seront retirés du planning.')) return;
    void actions.deleteTeam(existing.id);
    onClose();
  };
  const save = () => {
    const team = { ...draft, name: draft.name.trim() };
    const outside = existing ? eventsOutsideTeam(state, team) : [];
    if (outside.length) {
      if (!confirm(`${outside.length} activité(s) sortiront de la période de l'équipe et seront retirées du planning. Continuer ?`)) return;
      for (const e of outside) void actions.deleteEvent(e.id);
    }
    void actions.saveTeam(team, memberIds);
    onClose();
  };
  return (
    <Sheet title={existing ? existing.name : 'Nouvelle équipe'} onClose={onClose}>
      <p className="muted">Les membres d'une équipe font les mêmes activités sur toute sa période (ex. bateau 4 jours). Les autres restent dans « Tout le groupe ».</p>
      <Field label="Nom">
        <input aria-label="Nom de l'équipe" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
      </Field>
      <Field label="Couleur">
        <div className="row swatches">
          {TEAM_COLORS.map(c => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={draft.color === c}
              className="swatch" style={{ background: c }}
              onClick={() => setDraft(d => ({ ...d, color: c }))} />
          ))}
        </div>
      </Field>
      <Field label="Du">
        <select aria-label="Début de l'équipe" value={start} onChange={e => setBound('start', Number(e.target.value))}>
          {plannable.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      <Field label="Au">
        <select aria-label="Fin de l'équipe" value={end} onChange={e => setBound('end', Number(e.target.value))}>
          {plannable.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      {start > end && <p className="error" role="alert">La fin doit être après le début.</p>}
      <Field label={`Membres (${memberIds.length})`}>
        <PeoplePicker people={state.people} selected={memberIds} onChange={setMemberIds} />
      </Field>
      <div className="sheet-actions">
        {existing ? <button className="danger" onClick={remove}>Supprimer</button> : <span />}
        <button className="primary" disabled={!valid} onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  );
}
