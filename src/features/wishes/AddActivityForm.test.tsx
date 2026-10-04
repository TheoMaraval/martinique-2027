import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddActivityForm } from './AddActivityForm';
import { renderWithTrip } from '../../test/renderWithTrip';

describe('AddActivityForm', () => {
  it('exige un nom', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(screen.getByRole('alert')).toHaveTextContent('Donne un nom');
    expect(actions.saveActivity).not.toHaveBeenCalled();
  });

  it('crée une activité simple par défaut (flex)', async () => {
    const onDone = vi.fn();
    const { actions } = renderWithTrip(<AddActivityForm onDone={onDone} />);
    expect(screen.getByLabelText(/Activité simple/)).toBeChecked();
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'Plongée');
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(actions.saveActivity).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plongée', durations: ['flex'], is_custom: true, created_by: 'p1' }),
      expect.objectContaining({ person_id: 'p1', duration: 'flex', quantity: 1 }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('crée un séjour de plusieurs jours avec ses formules triées', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'Croisière');
    await userEvent.click(screen.getByLabelText('Séjour de plusieurs jours'));
    const days = screen.getByLabelText('Nombre de jours');
    const nights = screen.getByLabelText('Nombre de nuits');
    await userEvent.clear(days); await userEvent.type(days, '3');
    await userEvent.clear(nights); await userEvent.type(nights, '2');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter la formule' }));
    await userEvent.clear(days); await userEvent.type(days, '2');
    await userEvent.clear(nights); await userEvent.type(nights, '1');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter la formule' }));
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    const [a, w] = vi.mocked(actions.saveActivity).mock.calls[0];
    expect(a.durations).toEqual(['multi:2:1', 'multi:3:2']);
    expect(w?.duration).toBe('multi:2:1');
  });

  it('exige une formule pour un séjour', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'X');
    await userEvent.click(screen.getByLabelText('Séjour de plusieurs jours'));
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ajouter la formule');
    expect(actions.saveActivity).not.toHaveBeenCalled();
  });
});

describe('AddActivityForm finitions', () => {
  it('réutilise la catégorie existante (casse)', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'X');
    await userEvent.selectOptions(screen.getByLabelText('Catégorie'), '__new');
    await userEvent.type(screen.getByLabelText('Nom de la nouvelle catégorie'), ' mer ');
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    const [a] = vi.mocked(actions.saveActivity).mock.calls[0];
    expect(a.category).toBe('Mer');
  });
});
