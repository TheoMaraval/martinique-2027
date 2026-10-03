import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { TripContext, type TripActions, type TripCtx } from '../data/TripContext';
import type { TripState } from '../domain/types';
import { makeState } from './fixtures';

export function fakeActions(): TripActions {
  const fn = () => vi.fn().mockResolvedValue(undefined);
  return {
    setBudget: fn(), saveWish: fn(), deleteWish: fn(), saveActivity: fn(), deleteActivity: fn(),
    saveTeam: fn(), deleteTeam: fn(), saveEvent: fn(), deleteEvent: fn(), addComment: fn(),
    deleteComment: fn(), saveStay: fn(), chooseStay: fn(), deleteStay: fn(),
  };
}

export function renderWithTrip(
  ui: ReactElement,
  { state = makeState(), me = 'p1', actions = fakeActions() }: { state?: TripState; me?: string; actions?: TripActions } = {},
) {
  const value: TripCtx = {
    status: 'ready', state, online: true, me, setMe: vi.fn(), toasts: [], dismissToast: vi.fn(), actions, retry: vi.fn(),
  };
  return { ...render(<TripContext.Provider value={value}>{ui}</TripContext.Provider>), actions };
}
