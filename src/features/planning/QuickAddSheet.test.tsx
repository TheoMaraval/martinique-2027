import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddSheet } from './QuickAddSheet';
import { PlanningContext, type PlanningCtx } from './PlanningContext';
import { makeActivity, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

describe('QuickAddSheet', () => {
  it('liste une activité simple une seule fois et les formules multi-jours séparément', async () => {
    const base = makeState();
    const state = makeState({
      activities: [...base.activities.filter(a => a.id !== 'surf'), makeActivity('surf', 'Surf', 'Mer', ['half', 'day'])],
      wishes: [{ id: 'w', trip_id: 'trip', person_id: 'p2', activity_id: 'surf', duration: 'half', quantity: 1 }],
    });
    const ctx: PlanningCtx = { openSheet: vi.fn(), place: vi.fn(), moveEvent: vi.fn(), alerts: [] };
    renderWithTrip(<PlanningContext.Provider value={ctx}><QuickAddSheet teamId="all" idx={4} onClose={vi.fn()} /></PlanningContext.Provider>, { state });
    expect(screen.getAllByRole('button', { name: /^Surf/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Surf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bateau multi-jours\s*·\s*4j\/3n$/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Surf' }));
    expect(ctx.place).toHaveBeenCalledWith(expect.objectContaining({ duration: 'flex', personIds: ['p2'] }), 'all', 4);
  });
});
