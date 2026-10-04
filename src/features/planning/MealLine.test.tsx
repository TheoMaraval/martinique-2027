import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { MealLine } from './MealLine';
import { PlanningContext, type PlanningCtx } from './PlanningContext';
import { makeMeal, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const ctx = (): PlanningCtx => ({ openSheet: vi.fn(), place: vi.fn(), moveEvent: vi.fn(), alerts: [] });
const wrap = (ui: React.ReactNode, c = ctx()) => <PlanningContext.Provider value={c}><DndContext>{ui}</DndContext></PlanningContext.Provider>;
const state = makeState();

describe('MealLine', () => {
  it('propose « + Déjeuner » quand rien n\'est noté et ouvre la fiche repas', async () => {
    const c = ctx();
    renderWithTrip(wrap(<MealLine team={state.teams[0]} date="2027-04-16" kind="dejeuner" />, c), { state });
    await userEvent.click(screen.getByRole('button', { name: '+ Déjeuner' }));
    expect(c.openSheet).toHaveBeenCalledWith({ kind: 'meal', teamId: 'all', date: '2027-04-16', meal: 'dejeuner' });
  });

  it('affiche le lieu du dîner et son lien http(s)', () => {
    const s = makeState({
      meals: [makeMeal({ id: 'm', date: '2027-04-16', kind: 'diner', place_name: 'Chez Lulu', links: [{ url: 'javascript:alert(1)', label: 'x' }, { url: 'https://lulu.mq', label: 'Lulu' }] })],
    });
    renderWithTrip(wrap(<MealLine team={s.teams[0]} date="2027-04-16" kind="diner" />), { state: s });
    expect(screen.getByText('Dîner : Chez Lulu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lulu/ })).toHaveAttribute('href', 'https://lulu.mq');
  });

  it('n\'apparaît pas sur un créneau bloqué', () => {
    const { container } = renderWithTrip(wrap(<MealLine team={state.teams[0]} date="2027-04-15" kind="dejeuner" />), { state });
    expect(within(container).queryByRole('button')).toBeNull();
  });
});
