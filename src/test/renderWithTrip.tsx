import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { TripContext, type TripActions, type TripCtx } from '../data/TripContext';
import type { TripState } from '../domain/types';
import { makeState } from './fixtures';

export function fakeActions(): TripActions {
  const fn = () => vi.fn().mockResolvedValue(true);
  return {
    setBudget: fn(), saveWish: fn(), deleteWish: fn(), saveActivity: fn(), deleteActivity: fn(),
    saveTeam: fn(), deleteTeam: fn(), saveEvent: fn(), saveEventDetails: fn(), deleteEvent: fn(), addComment: fn(),
    deleteComment: fn(), saveStay: fn(), chooseStay: fn(), deleteStay: fn(), saveMeal: fn(), deleteMeal: fn(),
  };
}

export function renderWithTrip(
  ui: ReactElement,
  { state = makeState(), me = 'p1', actions = fakeActions() }: { state?: TripState; me?: string; actions?: TripActions } = {},
) {
  const wrap = (s: TripState) => {
    const value: TripCtx = {
      status: 'ready', state: s, online: true, me, setMe: vi.fn(), toasts: [], dismissToast: vi.fn(), actions, retry: vi.fn(), notify: vi.fn(),
    };
    return <TripContext.Provider value={value}>{ui}</TripContext.Provider>;
  };
  const result = render(wrap(state));
  /** Simule un changement de l'état partagé (synchro temps réel, autre appareil). */
  const setState = (s: TripState) => result.rerender(wrap(s));
  return { ...result, actions, setState };
}
