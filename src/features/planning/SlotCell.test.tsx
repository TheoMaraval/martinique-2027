import { screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SlotCell } from './SlotCell';
import { PlanningContext, type PlanningCtx } from './PlanningContext';
import { makeEvent, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const ctx = (): PlanningCtx => ({ openSheet: vi.fn(), place: vi.fn(), moveEvent: vi.fn(), alerts: [] });
const wrap = (ui: React.ReactNode, c = ctx()) => <PlanningContext.Provider value={c}><DndContext>{ui}</DndContext></PlanningContext.Provider>;

// 16/04 : Matin = 4, Midi = 5, Après-midi = 6.
const state = makeState({
  events: [
    makeEvent({ id: 'b', activity_id: 'rando', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
    makeEvent({ id: 'a', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
    makeEvent({ id: 'c', activity_id: 'surf', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'midi' }),
  ],
});

describe('SlotCell', () => {
  it('numérote les 2 activités du créneau et masque « + » quand la capacité est atteinte', () => {
    const team = state.teams[0];
    renderWithTrip(wrap(<SlotCell team={team} idx={4} />), { state });
    const tiles = screen.getAllByRole('button', { name: /^\d\./ });
    expect(tiles.map(t => t.textContent?.slice(0, 2))).toEqual(['1.', '2.']);
    expect(tiles[0]).toHaveTextContent('Surf');
    expect(tiles[1]).toHaveTextContent('Randonnée');
    expect(screen.queryByRole('button', { name: /Ajouter une activité/ })).toBeNull();
  });

  it('Midi : 1 activité suffit à remplir le créneau, sans numéro', () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={5} />), { state });
    expect(screen.queryByRole('button', { name: /Ajouter une activité/ })).toBeNull();
    expect(screen.queryByText(/^1\./)).toBeNull();
  });

  it('garde « + » tant qu\'il reste de la place', () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={6} />), { state });
    expect(screen.getByRole('button', { name: 'Ajouter une activité (Après-midi)' })).toBeInTheDocument();
  });

  it('n\'affiche pas de « · » vide pour une activité simple', () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={5} />), { state });
    expect(screen.getByText(/pers\./).textContent).toBe('0 pers.');
  });
});
