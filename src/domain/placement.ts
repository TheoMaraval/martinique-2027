import type { DurationKey, TripEvent, TripState } from './types';
import type { UnplacedItem } from './unplaced';
import { buildSlots, slotAt, slotIndex } from './slots';
import { normalizeStart } from './durations';
import { rosterAt, teamCovers } from './teams';

export function canDrop(s: TripState, teamId: string, idx: number): boolean {
  const team = s.teams.find(t => t.id === teamId);
  const slot = buildSlots(s.trip)[idx];
  return !!team && !!slot && slot.plannable && teamCovers(s, team, idx);
}

export function buildPlacedEvent(
  s: TripState, item: UnplacedItem, teamId: string, idx: number, id: string,
): { event: TripEvent; participantIds: string[] } {
  const start = normalizeStart(s.trip, item.duration, slotAt(s.trip, idx));
  const roster = rosterAt(s, teamId, slotIndex(s.trip, start.date, start.part));
  const interested = roster.filter(p => item.personIds.includes(p));
  return {
    event: {
      id, trip_id: s.trip.id, team_id: teamId, activity_id: item.activity.id, duration: item.duration,
      occurrence: item.occurrence, start_date: start.date, start_part: start.part, place_name: '',
      lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '',
    },
    participantIds: interested.length ? interested : roster,
  };
}

export function nextOccurrence(s: TripState, activityId: string, duration: DurationKey): number {
  const used = new Set(s.events.filter(e => e.activity_id === activityId && e.duration === duration).map(e => e.occurrence));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}
