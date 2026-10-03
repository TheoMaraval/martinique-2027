import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaySheet } from './StaySheet';
import { makeState, makeStay } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

vi.mock('../../ui/MapPicker', () => ({ MapPicker: () => null }));

const state = makeState({
  stays: [
    makeStay({ id: 'o1', night_date: '2027-04-16', place_name: 'Gîte A', price: 600, links: [{ url: 'https://a.mq', label: 'Annonce A' }] }),
    makeStay({ id: 'o2', night_date: '2027-04-16', place_name: 'Gîte B', price: 800, chosen: false }),
  ],
});

describe('StaySheet', () => {
  it('liste les options avec leurs liens et retient celle choisie', async () => {
    const { actions } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    expect(screen.getByRole('link', { name: /Annonce A/ })).toHaveAttribute('href', 'https://a.mq');
    expect(screen.getByRole('radio', { name: 'Retenir Gîte A' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Retenir Gîte B' }));
    expect(actions.chooseStay).toHaveBeenCalledWith('o2');
  });

  it('propose une nouvelle option de logement', async () => {
    const { actions } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    await userEvent.click(screen.getByRole('button', { name: 'Proposer un logement' }));
    await userEvent.type(screen.getByLabelText('Nom du lieu'), 'Villa C');
    await userEvent.click(screen.getByRole('button', { name: "Enregistrer l'option" }));
    expect(actions.saveStay).toHaveBeenCalledWith(expect.objectContaining({ place_name: 'Villa C', team_id: 'all', night_date: '2027-04-16' }));
  });
});
