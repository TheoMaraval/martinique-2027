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

describe('AddActivityForm finitions', () => {
  it('réutilise la catégorie existante (casse) et trie les durées', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'X');
    await userEvent.selectOptions(screen.getByLabelText('Catégorie'), '__new');
    await userEvent.type(screen.getByLabelText('Nom de la nouvelle catégorie'), ' mer ');
    await userEvent.click(screen.getByLabelText('Soir'));
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    const [a, w] = vi.mocked(actions.saveActivity).mock.calls[0];
    expect(a.category).toBe('Mer');
    expect(a.durations).toEqual(['half', 'evening']);
    expect(w.duration).toBe('half');
  });
  it('indique le bouton multi-jours', async () => {
    renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'X');
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(screen.getByRole('alert')).toHaveTextContent('+ Multi-jours');
  });
});
