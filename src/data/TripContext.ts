import { createContext, useContext } from 'react';
import type { Activity, EventComment, Stay, Team, TripEvent, TripState, Wish } from '../domain/types';

export type Status = 'loading' | 'ready' | 'invalid' | 'error';
export interface Toast { id: string; text: string }

export interface TripActions {
  setBudget(personId: string, budget: number | null): Promise<void>;
  saveWish(w: Wish): Promise<void>;
  deleteWish(id: string): Promise<void>;
  /** creatorWish : l'envie du créateur, enregistrée juste après l'activité. */
  saveActivity(a: Activity, creatorWish?: Wish): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  saveTeam(t: Team, memberIds: string[]): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  saveEvent(e: TripEvent, participantIds?: string[]): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  addComment(c: EventComment): Promise<void>;
  deleteComment(id: string): Promise<void>;
  saveStay(st: Stay): Promise<void>;
  chooseStay(id: string): Promise<void>;
  deleteStay(id: string): Promise<void>;
}

export interface TripCtx {
  status: Status;
  state: TripState | null;
  online: boolean;
  me: string | null;
  setMe(id: string | null): void;
  toasts: Toast[];
  dismissToast(id: string): void;
  actions: TripActions;
  retry(): void;
}

export const TripContext = createContext<TripCtx | null>(null);

export function useTrip(): TripCtx {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip hors de TripProvider');
  return ctx;
}

/** Pour les onglets : l'état est chargé et la personne identifiée. */
export function useReadyTrip(): TripCtx & { state: TripState; me: string } {
  const ctx = useTrip();
  if (!ctx.state || !ctx.me) throw new Error('Voyage non prêt');
  return { ...ctx, state: ctx.state, me: ctx.me };
}
