import type { Activity, Meal, Stay, Team, TripEvent, TripState } from '../domain/types';

export const TRIP = { id: 'trip', name: 'Martinique 2027', start_date: '2027-04-15', end_date: '2027-04-25' };

export function makeActivity(id: string, name: string, category: string, durations: string[], has_quantity = false): Activity {
  return { id, trip_id: 'trip', name, category, durations, has_quantity, description: '', links: [], is_custom: false, created_by: null };
}

export function makeTeam(p: Partial<Team> & Pick<Team, 'id'>): Team {
  return {
    trip_id: 'trip', name: p.id, color: '#ff6f59', start_date: '2027-04-15', start_part: 'matin',
    end_date: '2027-04-25', end_part: 'soir', is_default: false, ...p,
  };
}

export function makeEvent(
  p: Partial<TripEvent> & Pick<TripEvent, 'id' | 'activity_id' | 'duration' | 'start_date' | 'start_part'>,
): TripEvent {
  return {
    trip_id: 'trip', team_id: 'all', occurrence: 1, end_date: null, end_part: null, place_name: '', lat: null, lng: null,
    price: null, price_mode: 'total', links: [], notes: '', ...p,
  };
}

export function makeMeal(p: Partial<Meal> & Pick<Meal, 'id' | 'date' | 'kind'>): Meal {
  return {
    trip_id: 'trip', team_id: 'all', place_name: '', lat: null, lng: null, links: [],
    price: null, price_mode: 'total', notes: '', ...p,
  };
}

export function makeStay(p: Partial<Stay> & Pick<Stay, 'id' | 'night_date'>): Stay {
  return {
    trip_id: 'trip', team_id: 'all', place_name: '', lat: null, lng: null,
    price: null, price_mode: 'total', links: [], notes: '', chosen: true, ...p,
  };
}

export function participants(eventId: string, ids: string[]) {
  return ids.map(person_id => ({ trip_id: 'trip', event_id: eventId, person_id }));
}

export function members(teamId: string, ids: string[]) {
  return ids.map(person_id => ({ trip_id: 'trip', team_id: teamId, person_id }));
}

export function makeState(over: Partial<TripState> = {}): TripState {
  return {
    trip: TRIP,
    people: ['Théo', 'Jules', 'Inès', 'Louise'].map((name, i) => ({
      id: `p${i + 1}`, trip_id: 'trip', name, budget_max: 1000, sort: i,
    })),
    activities: [
      makeActivity('boat', 'Bateau multi-jours', 'Bateau', ['multi:4:3', 'multi:3:3', 'multi:3:2']),
      makeActivity('surf', 'Surf', 'Mer', ['half', 'day']),
      makeActivity('rando', 'Randonnée', 'Nature', ['half', 'day'], true),
    ],
    wishes: [],
    teams: [makeTeam({ id: 'all', name: 'Tout le groupe', color: '#0e9aa7', is_default: true })],
    team_members: [], events: [], event_participants: [], event_comments: [], stays: [], meals: [],
    ...over,
  };
}
