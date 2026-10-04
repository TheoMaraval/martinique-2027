import { screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SlotCell } from './SlotCell';
import { PlanningContext, type PlanningCtx } from './PlanningContext';
import { makeEvent, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const ctx = (): PlanningCtx => ({ openSheet: vi.fn(), place: vi.fn(), moveEvent: vi.fn(), alerts: [] });
const wrap = (ui: React.ReactNode, c = ctx()) => <PlanningContext.Provider value={c}><DndContext>{ui}</DndContext></PlanningContext.Provider>;

// 16/04 : Matin = 4, Midi = 5, Après-midi = 6, Soir = 7.
const state = makeState({
  events: [
    makeEvent({ id: 'b', activity_id: 'rando', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
    makeEvent({ id: 'a', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
    makeEvent({ id: 'c', activity_id: 'surf', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'midi' }),
    makeEvent({ id: 'd', activity_id: 'surf', duration: 'flex', occurrence: 3, start_date: '2027-04-16', start_part: 'matin' }),
    makeEvent({ id: 'e', activity_id: 'rando', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'aprem' }),
    makeEvent({ id: 'f', activity_id: 'surf', duration: 'flex', occurrence: 4, start_date: '2027-04-16', start_part: 'aprem' }),
  ],
});

describe('SlotCell', () => {
  it('numérote les 3 activités du créneau et masque « + » quand la capacité est atteinte', () => {
    const team = state.teams[0];
    renderWithTrip(wrap(<SlotCell team={team} idx={4} />), { state });
    const tiles = screen.getAllByRole('button', { name: /^\d\./ });
    expect(tiles.map(t => t.textContent?.slice(0, 2))).toEqual(['1.', '2.', '3.']);
    expect(tiles[0]).toHaveTextContent('Surf');
    expect(tiles[1]).toHaveTextContent('Randonnée');
    expect(tiles[2]).toHaveTextContent('Surf');
    expect(screen.queryByRole('button', { name: /Ajouter une activité/ })).toBeNull();
  });

  it("numérote dès 2 activités et garde « + » tant qu'il reste de la place", () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={6} />), { state });
    const tiles = screen.getAllByRole('button', { name: /^\d\./ });
    expect(tiles.map(t => t.textContent?.slice(0, 2))).toEqual(['1.', '2.']);
    expect(screen.getByRole('button', { name: 'Ajouter une activité (Après-midi)' })).toBeInTheDocument();
  });

  it('Midi : 1 activité sans numéro, « + » toujours proposé', () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={5} />), { state });
    expect(screen.getByRole('button', { name: 'Ajouter une activité (Midi)' })).toBeInTheDocument();
    expect(screen.queryByText(/^1\./)).toBeNull();
  });

  it('n\'affiche pas de « · » vide pour une activité simple', () => {
    renderWithTrip(wrap(<SlotCell team={state.teams[0]} idx={5} />), { state });
    expect(screen.getByText(/pers\./).textContent).toBe('0 pers.');
  });
});
