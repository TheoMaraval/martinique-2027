import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MealSheet } from './MealSheet';
import { makeMeal, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

vi.mock('../../ui/MapPicker', () => ({ MapPicker: () => null }));

describe('MealSheet', () => {
  it('crée automatiquement un nouveau déjeuner dès qu\'un champ est rempli (prix pour info)', async () => {
    const { actions } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="dejeuner" onClose={vi.fn()} />);
    expect(screen.getByText('Prix (pour info, hors budget)')).toBeInTheDocument();
    expect(screen.queryByText(/\/ pers\./)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Nom du lieu'), 'Snack Lulu');
    await userEvent.type(screen.getByLabelText('Montant (€)'), '25');
    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
    await waitFor(() => expect(actions.saveMeal).toHaveBeenCalledWith(expect.objectContaining({
      team_id: 'all', date: '2027-04-16', kind: 'dejeuner', place_name: 'Snack Lulu', price: 25,
    })));
    expect(actions.saveMeal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Enregistré'));
  });

  it("ne crée pas de repas vide, même à la fermeture", async () => {
    const { actions, unmount } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="diner" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Notes'), '   ');
    unmount();
    expect(actions.saveMeal).not.toHaveBeenCalled();
  });

  it('enregistre à la fermeture ce qui est encore en attente', async () => {
    const onClose = vi.fn();
    const { actions, unmount } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="diner" onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Notes'), 'Réserver');
    expect(actions.saveMeal).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(actions.saveMeal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'diner', notes: 'Réserver' }));
  });

  it("n'enregistre pas un prix invalide", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const state = makeState({ meals: [makeMeal({ id: 'm1', date: '2027-04-16', kind: 'diner', place_name: 'Chez Lulu' })] });
    const { actions, unmount } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="diner" onClose={vi.fn()} />, { state });
    await userEvent.type(screen.getByLabelText('Montant (€)'), 'abc');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
    unmount();
    expect(actions.saveMeal).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('modifie et supprime un dîner existant, sans le ré-enregistrer', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const state = makeState({ meals: [makeMeal({ id: 'm1', date: '2027-04-16', kind: 'diner', place_name: 'Chez Lulu' })] });
    const { actions, unmount } = renderWithTrip(<MealSheet teamId="all" date="2027-04-16" kind="diner" onClose={vi.fn()} />, { state });
    expect(screen.getByLabelText('Nom du lieu')).toHaveValue('Chez Lulu');
    await userEvent.type(screen.getByLabelText('Nom du lieu'), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(actions.deleteMeal).toHaveBeenCalledWith('m1');
    unmount();
    expect(actions.saveMeal).not.toHaveBeenCalled();
  });
});
