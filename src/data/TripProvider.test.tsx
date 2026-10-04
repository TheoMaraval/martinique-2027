import { act, render, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { TripProvider } from './TripProvider';
import { TripContext, type TripCtx } from './TripContext';
import { makeEvent, makeState, participants } from '../test/fixtures';

const channel = { on: () => channel, subscribe: () => channel, send: vi.fn() };
vi.mock('./supabase', () => ({ supabase: { channel: () => channel, removeChannel: vi.fn() } }));

type Deferred = { resolve: () => void; reject: (e: Error) => void };
const calls: string[] = [];
const deferred: Deferred[] = [];
/** Appel distant qui ne se termine que quand le test le décide. */
const controlled = (name: string) => vi.fn(() => {
  calls.push(name);
  return new Promise<void>((resolve, reject) => { deferred.push({ resolve, reject }); });
});

const api = {
  getTrip: vi.fn(),
  upsertEvent: controlled('upsertEvent'),
  deleteEvent: controlled('deleteEvent'),
  updateEventDetails: controlled('updateEventDetails'),
  setEventParticipants: controlled('setEventParticipants'),
};
vi.mock('./api', async orig => ({ ...(await orig<typeof import('./api')>()), makeApi: () => api }));

const surf = makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' });

async function setup() {
  api.getTrip.mockResolvedValue(makeState({ events: [surf], event_participants: participants('e1', ['p1']) }));
  let ctx!: TripCtx;
  function Probe() {
    ctx = useContext(TripContext)!;
    return null;
  }
  render(<TripProvider code="code-test"><Probe /></TripProvider>);
  await waitFor(() => expect(ctx.status).toBe('ready'));
  return () => ctx;
}

describe('TripProvider', () => {
  beforeEach(() => {
    calls.length = 0;
    deferred.length = 0;
    vi.clearAllMocks();
  });

  it('envoie les appels distants un par un, dans l’ordre (enregistrer puis supprimer)', async () => {
    const ctx = await setup();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = ctx().actions.saveEvent({ ...surf, notes: 'a' });
      second = ctx().actions.deleteEvent('e1');
    });
    // Mise à jour locale immédiate, appels distants en file.
    expect(ctx().state!.events).toEqual([]);
    await waitFor(() => expect(calls).toEqual(['upsertEvent']));
    await act(async () => { deferred[0].resolve(); });
    await waitFor(() => expect(calls).toEqual(['upsertEvent', 'deleteEvent']));
    await act(async () => { deferred[1].resolve(); });
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('deux enregistrements rapides partent dans l’ordre', async () => {
    const ctx = await setup();
    act(() => {
      void ctx().actions.saveEvent({ ...surf, notes: 'a' });
      void ctx().actions.saveEvent({ ...surf, notes: 'b' });
    });
    await waitFor(() => expect(api.upsertEvent).toHaveBeenCalledTimes(1));
    expect(api.upsertEvent).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'a' }));
    await act(async () => { deferred[0].resolve(); });
    await waitFor(() => expect(api.upsertEvent).toHaveBeenCalledTimes(2));
    expect(api.upsertEvent).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'b' }));
    await act(async () => { deferred[1].resolve(); });
  });

  it('renvoie false en cas d’échec, affiche un message, et la file continue', async () => {
    const ctx = await setup();
    let failed!: Promise<boolean>;
    let next!: Promise<boolean>;
    act(() => {
      failed = ctx().actions.saveEvent({ ...surf, notes: 'a' });
      next = ctx().actions.deleteEvent('e1');
    });
    await waitFor(() => expect(deferred).toHaveLength(1));
    await act(async () => { deferred[0].reject(new Error('boom')); });
    await expect(failed).resolves.toBe(false);
    expect(ctx().toasts.map(t => t.text)).toEqual(["La modification n'a pas pu être enregistrée."]);
    await waitFor(() => expect(deferred).toHaveLength(2));
    await act(async () => { deferred[1].resolve(); });
    await expect(next).resolves.toBe(true);
  });

  it('saveEventDetails applique le patch sur la ligne actuelle et n’envoie que les détails', async () => {
    const ctx = await setup();
    let done!: Promise<boolean>;
    act(() => { done = ctx().actions.saveEventDetails('e1', { notes: 'x', price: 30 }, ['p1', 'p2']); });
    expect(ctx().state!.events[0]).toMatchObject({ id: 'e1', start_part: 'matin', notes: 'x', price: 30 });
    expect(ctx().state!.event_participants.map(p => p.person_id)).toEqual(['p1', 'p2']);
    await waitFor(() => expect(api.updateEventDetails).toHaveBeenCalledWith('e1', { notes: 'x', price: 30 }));
    await act(async () => { deferred[0].resolve(); });
    await waitFor(() => expect(api.setEventParticipants).toHaveBeenCalledWith('e1', ['p1', 'p2']));
    await act(async () => { deferred[1].resolve(); });
    await expect(done).resolves.toBe(true);
    expect(api.upsertEvent).not.toHaveBeenCalled();
  });
});
