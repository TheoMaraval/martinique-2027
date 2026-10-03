export type Part = 'matin' | 'aprem' | 'soir';
/** 'half' | 'day' | 'evening' | `multi:${jours}:${nuits}` */
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
  start_date: string; start_part: Part; place_name: string; lat: number | null; lng: number | null;
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
export interface TripState {
  trip: Trip; people: Person[]; activities: Activity[]; wishes: Wish[]; teams: Team[];
  team_members: TeamMember[]; events: TripEvent[]; event_participants: EventParticipant[];
  event_comments: EventComment[]; stays: Stay[];
}
