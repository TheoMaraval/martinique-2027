import { supabase } from './supabase';
import type { Activity, EventComment, Meal, Stay, Team, TripEvent, TripState, Wish } from '../domain/types';
import type { EventDetails } from './TripContext';

export class InvalidCodeError extends Error {}

const MESSAGES: Record<string, string> = {
  activity_in_use: "Cette activité est déjà dans le planning : retire-la d'abord.",
  forbidden: 'Action non autorisée.',
  invalid_input: 'Valeurs invalides.',
};

export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  for (const k of Object.keys(MESSAGES)) if (msg.includes(k)) return MESSAGES[k];
  return "La modification n'a pas pu être enregistrée.";
}

export function makeApi(code: string) {
  async function call<T = void>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await supabase.rpc(fn, { p_code: code, ...args });
    if (error) {
      if (error.message.includes('invalid_code')) throw new InvalidCodeError(error.message);
      throw new Error(error.message);
    }
    return data as T;
  }
  return {
    getTrip: () => call<TripState>('get_trip'),
    setBudget: (personId: string, budget: number | null) => call('set_budget', { p_person: personId, p_budget: budget }),
    upsertWish: (w: Wish) => call('upsert_wish', { p: w }),
    deleteWish: (id: string) => call('delete_wish', { p_id: id }),
    upsertActivity: (a: Activity) => call('upsert_activity', { p: a }),
    deleteActivity: (id: string, personId: string) => call('delete_activity', { p_id: id, p_person: personId }),
    upsertTeam: (t: Team) => call('upsert_team', { p: t }),
    deleteTeam: (id: string) => call('delete_team', { p_id: id }),
    setTeamMembers: (teamId: string, ids: string[]) => call('set_team_members', { p_team: teamId, p_people: ids }),
    upsertEvent: (e: TripEvent) => call('upsert_event', { p: e }),
    updateEventDetails: (id: string, details: EventDetails) => call('update_event_details', { p_id: id, p: details }),
    deleteEvent: (id: string) => call('delete_event', { p_id: id }),
    setEventParticipants: (eventId: string, ids: string[]) => call('set_event_participants', { p_event: eventId, p_people: ids }),
    addComment: (c: EventComment) => call('add_comment', { p: c }),
    deleteComment: (id: string, authorId: string) => call('delete_comment', { p_id: id, p_author: authorId }),
    upsertStay: (st: Stay) => call('upsert_stay', { p: st }),
    chooseStay: (id: string) => call('choose_stay', { p_id: id }),
    deleteStay: (id: string) => call('delete_stay', { p_id: id }),
    upsertMeal: (m: Meal) => call('upsert_meal', { p: m }),
    deleteMeal: (id: string) => call('delete_meal', { p_id: id }),
  };
}

export type Api = ReturnType<typeof makeApi>;
