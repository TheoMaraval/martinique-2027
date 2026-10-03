import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSheet } from './TeamSheet';
import { renderWithTrip } from '../../test/renderWithTrip';

it('crée une équipe parallèle avec ses membres', async () => {
  const onClose = vi.fn();
  const { actions } = renderWithTrip(<TeamSheet teamId={null} onClose={onClose} />);
  await userEvent.clear(screen.getByLabelText("Nom de l'équipe"));
  await userEvent.type(screen.getByLabelText("Nom de l'équipe"), 'Bateau');
  await userEvent.click(screen.getByRole('button', { name: 'Théo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Inès' }));
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(actions.saveTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bateau', is_default: false }), ['p1', 'p3']);
  expect(onClose).toHaveBeenCalled();
});
