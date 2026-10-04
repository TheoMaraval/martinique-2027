import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MealSheet } from './MealSheet';
import { makeMeal, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

vi.mock('../../ui/MapPicker', () => ({ MapPicker: () => null }));

describe('MealSheet', () => {
  it('enregistre un nouveau déjeuner (prix pour info)', async () => {
    const onClose = vi.fn();
    const { actions } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="dejeuner" onClose={onClose} />);
    expect(screen.getByText('Prix (pour info, hors budget)')).toBeInTheDocument();
    expect(screen.queryByText(/\/ pers\./)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Nom du lieu'), 'Snack Lulu');
    await userEvent.type(screen.getByLabelText('Montant (€)'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(actions.saveMeal).toHaveBeenCalledWith(expect.objectContaining({
      team_id: 'all', date: '2027-04-16', kind: 'dejeuner', place_name: 'Snack Lulu', price: 25,
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('modifie et supprime un dîner existant', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const state = makeState({ meals: [makeMeal({ id: 'm1', date: '2027-04-16', kind: 'diner', place_name: 'Chez Lulu' })] });
    const { actions } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="diner" onClose={vi.fn()} />, { state });
    expect(screen.getByLabelText('Nom du lieu')).toHaveValue('Chez Lulu');
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(actions.deleteMeal).toHaveBeenCalledWith('m1');
  });
});
