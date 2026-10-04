import { createContext, useContext } from 'react';
import type { Activity, EventComment, Meal, Stay, Team, TripEvent, TripState, Wish } from '../domain/types';

export type Status = 'loading' | 'ready' | 'invalid' | 'error';
export interface Toast { id: string; text: string }

/** Détails d'une activité placée modifiables sans toucher à sa place dans le planning. */
export type EventDetails = Partial<Pick<TripEvent, 'place_name' | 'lat' | 'lng' | 'price' | 'price_mode' | 'links' | 'notes'>>;

/**
 * Actions : mise à jour locale immédiate (optimiste), puis appel distant ; les appels distants partent
 * un par un, dans l'ordre. Résolu par true si l'enregistrement a réussi, false sinon (message affiché).
 */
export interface TripActions {
  setBudget(personId: string, budget: number | null): Promise<boolean>;
  saveWish(w: Wish): Promise<boolean>;
  deleteWish(id: string): Promise<boolean>;
  /** creatorWish : l'envie du créateur, enregistrée juste après l'activité. */
  saveActivity(a: Activity, creatorWish?: Wish): Promise<boolean>;
  deleteActivity(id: string): Promise<boolean>;
  saveTeam(t: Team, memberIds: string[]): Promise<boolean>;
  deleteTeam(id: string): Promise<boolean>;
  saveEvent(e: TripEvent, participantIds?: string[]): Promise<boolean>;
  /** Enregistre seulement les détails (lieu, prix, liens, notes) sur la ligne actuelle, sans la déplacer. */
  saveEventDetails(eventId: string, details: EventDetails, participantIds?: string[]): Promise<boolean>;
  deleteEvent(id: string): Promise<boolean>;
  addComment(c: EventComment): Promise<boolean>;
  deleteComment(id: string): Promise<boolean>;
  saveStay(st: Stay): Promise<boolean>;
  chooseStay(id: string): Promise<boolean>;
  deleteStay(id: string): Promise<boolean>;
  /** Un seul repas par (équipe, jour, type) : remplace l'existant. */
  saveMeal(m: Meal): Promise<boolean>;
  deleteMeal(id: string): Promise<boolean>;
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
  /** Affiche un message court (toast). */
  notify(text: string): void;
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
