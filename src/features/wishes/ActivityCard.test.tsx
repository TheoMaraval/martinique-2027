import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityCard } from './ActivityCard';
import { makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const base = makeState();
const surf = base.activities.find(a => a.id === 'surf')!;
const rando = base.activities.find(a => a.id === 'rando')!;
const boat = base.activities.find(a => a.id === 'boat')!;

describe('ActivityCard', () => {
  it('« Ça me tente » enregistre une envie flex', async () => {
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    await userEvent.click(screen.getByLabelText('Ça me tente'));
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ person_id: 'p1', activity_id: 'surf', duration: 'flex', quantity: 1 }));
  });

  it('décoche une envie (anciens codes compris)', async () => {
    const state = makeState({ wishes: [{ id: 'w1', trip_id: 'trip', person_id: 'p1', activity_id: 'surf', duration: 'half', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />, { state });
    expect(screen.getByLabelText('Ça me tente')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Ça me tente'));
    expect(actions.deleteWish).toHaveBeenCalledWith('w1');
  });

  it('garde les formules pour un séjour multi-jours', async () => {
    const { actions } = renderWithTrip(<ActivityCard activity={boat} />);
    expect(screen.queryByLabelText('Ça me tente')).toBeNull();
    await userEvent.click(screen.getByLabelText('4j/3n'));
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ activity_id: 'boat', duration: 'multi:4:3' }));
  });

  it('montre qui est intéressé et la quantité', () => {
    const state = makeState({ wishes: [{ id: 'w2', trip_id: 'trip', person_id: 'p2', activity_id: 'rando', duration: 'flex', quantity: 3 }] });
    renderWithTrip(<ActivityCard activity={rando} />, { state });
    expect(screen.getByText('Jules ×3')).toBeInTheDocument();
  });

  it('choisit un nombre de randonnées', async () => {
    const state = makeState({ wishes: [{ id: 'w3', trip_id: 'trip', person_id: 'p1', activity_id: 'rando', duration: 'flex', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={rando} />, { state });
    await userEvent.selectOptions(screen.getByLabelText('Combien ?'), '3');
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ id: 'w3', quantity: 3 }));
  });

  it('affiche le multiplicateur de succès (personnes distinctes)', () => {
    const state = makeState({
      wishes: [
        { id: 'a', trip_id: 'trip', person_id: 'p2', activity_id: 'rando', duration: 'flex', quantity: 3 },
        { id: 'b', trip_id: 'trip', person_id: 'p3', activity_id: 'rando', duration: 'half', quantity: 1 },
        { id: 'c', trip_id: 'trip', person_id: 'p3', activity_id: 'rando', duration: 'day', quantity: 1 },
      ],
    });
    renderWithTrip(<ActivityCard activity={rando} />, { state });
    expect(screen.getByLabelText('Suggérée par 2 personne(s)')).toHaveTextContent('×2');
    // Une seule puce par personne sous « Ça me tente ».
    expect(screen.getAllByText('Inès')).toHaveLength(1);
  });
});

describe('ActivityCard suppression', () => {
  const custom = { ...surf, id: 'perso', name: 'Perso', is_custom: true, created_by: 'p1' };
  it('affiche la corbeille pour une activité perso non planifiée', () => {
    renderWithTrip(<ActivityCard activity={custom} />);
    expect(screen.getByLabelText('Supprimer Perso')).toBeInTheDocument();
  });
  it('masque la corbeille si l\'activité est au planning', () => {
    const state = makeState({ events: [{ id: 'e1', trip_id: 'trip', activity_id: 'perso' } as never] });
    renderWithTrip(<ActivityCard activity={custom} />, { state });
    expect(screen.queryByLabelText('Supprimer Perso')).toBeNull();
  });
});
