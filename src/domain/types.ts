export type Part = 'matin' | 'midi' | 'aprem' | 'soir';
/** 'flex' | `multi:${jours}:${nuits}` (anciens codes 'half' | 'day' | 'evening' lus comme 'flex'). */
export type DurationKey = string;
export type PriceMode = 'total' | 'per_person';

export interface Link { url: string; label: string }

export interface Trip { id: string; name: string; start_date: string; end_date: string }
export interface Person { id: string; trip_id: string; name: string; budget_max: number | null; sort: number }
export interface Activity {
  id: string; trip_id: string; name: string; category: string; durations: DurationKey[];
  has_quantity: boolean; description: string; links: Link[]; is_custom: boolean; created_by: string | null;
}
export interface Wish {
  id: string; trip_id: string; person_id: string; activity_id: string; duration: DurationKey; quantity: number;
}
export interface Team {
  id: string; trip_id: string; name: string; color: string;
  start_date: string; start_part: Part; end_date: string; end_part: Part; is_default: boolean;
}
export interface TeamMember { trip_id: string; team_id: string; person_id: string }
export interface TripEvent {
  id: string; trip_id: string; team_id: string; activity_id: string; duration: DurationKey; occurrence: number;
  start_date: string; start_part: Part;
  /** Fin d'emprise (incluse) d'une activité simple étirée ; null → 1 seul créneau (ou emprise multi-jours). */
  end_date: string | null; end_part: Part | null;
  place_name: string; lat: number | null; lng: number | null;
  price: number | null; price_mode: PriceMode; links: Link[]; notes: string;
}
export interface EventParticipant { trip_id: string; event_id: string; person_id: string }
export interface EventComment {
  id: string; trip_id: string; event_id: string; author_id: string; body: string; created_at: string;
}
export interface Stay {
  id: string; trip_id: string; team_id: string; night_date: string; place_name: string;
  lat: number | null; lng: number | null; price: number | null; price_mode: PriceMode; links: Link[]; notes: string;
  /** Plusieurs options par (équipe, nuit) ; une seule retenue. */
  chosen: boolean;
}
export type MealKind = 'dejeuner' | 'diner';
/** Repas d'une équipe pour un jour : pour info, jamais compté dans les dépenses. */
export interface Meal {
  id: string; trip_id: string; team_id: string; date: string; kind: MealKind; place_name: string;
  lat: number | null; lng: number | null; links: Link[]; price: number | null; price_mode: PriceMode; notes: string;
}
export interface TripState {
  trip: Trip; people: Person[]; activities: Activity[]; wishes: Wish[]; teams: Team[];
  team_members: TeamMember[]; events: TripEvent[]; event_participants: EventParticipant[];
  event_comments: EventComment[]; stays: Stay[]; meals: Meal[];
}
