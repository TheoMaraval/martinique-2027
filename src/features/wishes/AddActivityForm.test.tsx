import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddActivityForm } from './AddActivityForm';
import { renderWithTrip } from '../../test/renderWithTrip';

describe('AddActivityForm', () => {
  it('exige un nom et une durée', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(screen.getByRole('alert')).toHaveTextContent('Donne un nom');
    expect(actions.saveActivity).not.toHaveBeenCalled();
  });

  it('crée une activité personnalisée', async () => {
    const onDone = vi.fn();
    const { actions } = renderWithTrip(<AddActivityForm onDone={onDone} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'Plongée');
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(actions.saveActivity).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plongée', durations: ['half'], is_custom: true, created_by: 'p1' }),
      expect.objectContaining({ person_id: 'p1', duration: 'half', quantity: 1 }),
    );
    expect(onDone).toHaveBeenCalled();
  });
});
