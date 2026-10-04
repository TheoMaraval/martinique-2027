import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventSheet } from './EventSheet';
import { PlanningContext, type PlanningCtx } from './PlanningContext';
import { TripContext, type TripActions, type TripCtx } from '../../data/TripContext';
import type { TripState } from '../../domain/types';
import { makeEvent, makeState, participants } from '../../test/fixtures';
import { fakeActions, renderWithTrip } from '../../test/renderWithTrip';

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

describe('EventSheet — enregistrement automatique', () => {
  const ctxValue = (state: TripState, actions: TripActions): TripCtx => ({
    status: 'ready', state, online: true, me: 'p1', setMe: vi.fn(), toasts: [], dismissToast: vi.fn(), actions, retry: vi.fn(), notify: vi.fn(),
  });
  const ui = (state: TripState, actions: TripActions, planning?: Partial<PlanningCtx>) => (
    <TripContext.Provider value={ctxValue(state, actions)}>
      <PlanningContext.Provider value={{ openSheet: vi.fn(), place: vi.fn(), moveEvent: vi.fn(), alerts: [], ...planning }}>
        <EventSheet eventId="e1" onClose={vi.fn()} />
      </PlanningContext.Provider>
    </TripContext.Provider>
  );

  it("n'a plus de bouton « Enregistrer » ; enregistre les notes après une pause et l'indique", async () => {
    const { actions } = renderWithTrip(<EventSheet eventId="e1" onClose={vi.fn()} />, { state: makeState({ events: [surf] }) });
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Notes'), 'Spot du Diamant');
    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
    await waitFor(() => expect(actions.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', notes: 'Spot du Diamant' }), undefined));
    expect(actions.saveEvent).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Enregistré'));
  });

  it("n'applique que les champs modifiés depuis le dernier enregistrement, sur la dernière version de l'activité", async () => {
    const actions = fakeActions();
    const state = makeState({ events: [surf] });
    const { rerender } = render(ui(state, actions));
    await userEvent.type(screen.getByLabelText('Notes'), 'A');
    await waitFor(() => expect(actions.saveEvent).toHaveBeenCalledTimes(1));
    // Quelqu'un d'autre a changé le lieu et l'horaire entre-temps (synchro temps réel).
    const remote = { ...surf, notes: 'A', place_name: 'Plage des Salines', end_date: '2027-04-16', end_part: 'aprem' as const };
    rerender(ui(makeState({ events: [remote] }), actions));
    await userEvent.type(screen.getByLabelText('Notes'), 'B');
    await waitFor(() => expect(actions.saveEvent).toHaveBeenCalledTimes(2));
    expect(actions.saveEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ notes: 'AB', place_name: 'Plage des Salines', end_part: 'aprem' }), undefined,
    );
  });

  it('enregistre les participants seulement quand on les modifie, et immédiatement à la fermeture', async () => {
    const actions = fakeActions();
    const state = makeState({ events: [surf], event_participants: participants('e1', ['p1']) });
    const { unmount } = render(ui(state, actions));
    await userEvent.click(screen.getByRole('button', { name: /Jules/ }));
    expect(actions.saveEvent).not.toHaveBeenCalled();
    unmount();
    expect(actions.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), ['p1', 'p2']);
  });

  it('enregistre avant « Déplacer… »', async () => {
    const actions = fakeActions();
    const openSheet = vi.fn();
    render(ui(makeState({ events: [surf] }), actions, { openSheet }));
    await userEvent.type(screen.getByLabelText('Notes'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Déplacer…' }));
    expect(actions.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ notes: 'x' }), undefined);
    expect(openSheet).toHaveBeenCalledWith({ kind: 'move', eventId: 'e1' });
  });

  it("n'enregistre pas un budget invalide", async () => {
    const actions = fakeActions();
    const { unmount } = render(ui(makeState({ events: [surf] }), actions));
    await userEvent.type(screen.getByLabelText('Montant (€)'), '-3');
    expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
    unmount();
    expect(actions.saveEvent).not.toHaveBeenCalled();
  });

  it("« Retirer » n'enregistre pas les modifications en attente", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const actions = fakeActions();
    const { unmount } = render(ui(makeState({ events: [surf] }), actions));
    await userEvent.type(screen.getByLabelText('Notes'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(actions.deleteEvent).toHaveBeenCalledWith('e1');
    unmount();
    expect(actions.saveEvent).not.toHaveBeenCalled();
  });
});
