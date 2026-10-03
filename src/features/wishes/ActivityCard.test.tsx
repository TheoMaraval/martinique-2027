import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityCard } from './ActivityCard';
import { makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const base = makeState();
const surf = base.activities.find(a => a.id === 'surf')!;
const rando = base.activities.find(a => a.id === 'rando')!;

describe('ActivityCard', () => {
  it('coche une envie', async () => {
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />);
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ person_id: 'p1', activity_id: 'surf', duration: 'half', quantity: 1 }));
  });

  it('décoche une envie', async () => {
    const state = makeState({ wishes: [{ id: 'w1', trip_id: 'trip', person_id: 'p1', activity_id: 'surf', duration: 'half', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />, { state });
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    expect(actions.deleteWish).toHaveBeenCalledWith('w1');
  });

  it('montre qui est intéressé et la quantité', () => {
    const state = makeState({ wishes: [{ id: 'w2', trip_id: 'trip', person_id: 'p2', activity_id: 'rando', duration: 'day', quantity: 3 }] });
    renderWithTrip(<ActivityCard activity={rando} />, { state });
    expect(screen.getByText('Jules ×3')).toBeInTheDocument();
  });

  it('choisit un nombre de randonnées', async () => {
    const state = makeState({ wishes: [{ id: 'w3', trip_id: 'trip', person_id: 'p1', activity_id: 'rando', duration: 'half', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={rando} />, { state });
    await userEvent.selectOptions(screen.getByLabelText('Combien ?'), '3');
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ id: 'w3', quantity: 3 }));
  });

  it('affiche le multiplicateur de succès (personnes distinctes)', () => {
    const state = makeState({
      wishes: [
        { id: 'a', trip_id: 'trip', person_id: 'p2', activity_id: 'rando', duration: 'day', quantity: 3 },
        { id: 'b', trip_id: 'trip', person_id: 'p3', activity_id: 'rando', duration: 'half', quantity: 1 },
        { id: 'c', trip_id: 'trip', person_id: 'p3', activity_id: 'rando', duration: 'day', quantity: 1 },
      ],
    });
    renderWithTrip(<ActivityCard activity={rando} />, { state });
    expect(screen.getByLabelText('Suggérée par 2 personne(s)')).toHaveTextContent('×2');
  });
});
