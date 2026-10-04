import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventSheet } from './EventSheet';
import { makeEvent, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

vi.mock('../../ui/MapPicker', () => ({ MapPicker: () => null }));

const surf = makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' });
const boat = makeEvent({ id: 'e2', activity_id: 'boat', duration: 'multi:3:2', start_date: '2027-04-18', start_part: 'matin' });

describe('EventSheet', () => {
  it('titre sans formule pour une activité simple, avec formule pour un séjour', () => {
    const state = makeState({ events: [surf, boat] });
    const { unmount } = renderWithTrip(<EventSheet eventId="e1" onClose={vi.fn()} />, { state });
    expect(screen.getByRole('heading', { name: 'Surf' })).toBeInTheDocument();
    unmount();
    renderWithTrip(<EventSheet eventId="e2" onClose={vi.fn()} />, { state });
    expect(screen.getByRole('heading', { name: 'Bateau multi-jours · 3j/2n' })).toBeInTheDocument();
    expect(screen.queryByLabelText("Jusqu'à")).toBeNull();
  });

  it('étire avec le sélecteur « Jusqu\'à »', async () => {
    const { actions } = renderWithTrip(<EventSheet eventId="e1" onClose={vi.fn()} />, { state: makeState({ events: [surf] }) });
    expect(screen.getByText(/De : .*Matin/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Jusqu'à"), '6');
    expect(actions.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', end_date: '2027-04-16', end_part: 'aprem' }));
  });

  it('étend et réduit d\'un créneau', async () => {
    const stretched = { ...surf, end_date: '2027-04-16', end_part: 'midi' as const };
    const { actions } = renderWithTrip(<EventSheet eventId="e1" onClose={vi.fn()} />, { state: makeState({ events: [stretched] }) });
    await userEvent.click(screen.getByRole('button', { name: "Étendre d'un créneau" }));
    expect(actions.saveEvent).toHaveBeenLastCalledWith(expect.objectContaining({ end_part: 'aprem' }));
    await userEvent.click(screen.getByRole('button', { name: "Réduire d'un créneau" }));
    expect(actions.saveEvent).toHaveBeenLastCalledWith(expect.objectContaining({ end_part: 'matin' }));
  });

  it('désactive « Réduire » sur un seul créneau et « Étendre » quand c\'est impossible', () => {
    // Le dernier jour (25/04) : Matin puis Midi, Après-midi bloqué.
    const last = makeEvent({ id: 'e3', activity_id: 'surf', duration: 'flex', start_date: '2027-04-25', start_part: 'midi' });
    renderWithTrip(<EventSheet eventId="e3" onClose={vi.fn()} />, { state: makeState({ events: [last] }) });
    expect(screen.getByRole('button', { name: "Réduire d'un créneau" })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Étendre d'un créneau" })).toBeDisabled();
  });
});
