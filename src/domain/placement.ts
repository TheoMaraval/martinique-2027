import type { DurationKey, Team, TripEvent, TripState } from './types';
import type { UnplacedItem } from './unplaced';
import { buildSlots, type Slot, slotAt, slotIndex } from './slots';
import { normalizeStart, spanOf } from './durations';
import { rosterAt, teamCovers } from './teams';
import { eventSpan } from './conflicts';

export function canDrop(s: TripState, teamId: string, idx: number, duration: DurationKey): boolean {
  const team = s.teams.find(t => t.id === teamId);
  const slots = buildSlots(s.trip);
  const slot = slots[idx];
  if (!team || !slot || !slot.plannable || !teamCovers(s, team, idx)) return false;
  if (duration === 'half' && slot.part === 'soir') return false;
  const start = normalizeStart(s.trip, duration, slotAt(s.trip, idx));
  const si = slotIndex(s.trip, start.date, start.part);
  if (!slots[si]?.plannable || !teamCovers(s, team, si)) return false;
  const span = spanOf(s.trip, duration, start).slots;
  return span.length > 0 && span.every(i => teamCovers(s, team, i));
}

/** Activités de l'équipe dont au moins un créneau sort de la période de l'équipe. */
export function eventsOutsideTeam(s: TripState, team: Team): TripEvent[] {
  return s.events.filter(e => e.team_id === team.id && eventSpan(s, e).slots.some(i => !teamCovers(s, team, i)));
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

/** Créneaux de départ valides pour une durée : un seul par jour pour une journée ou une soirée. */
export function startOptions(s: TripState, teamId: string, duration: DurationKey): Slot[] {
  return buildSlots(s.trip).filter(slot => {
    if (!canDrop(s, teamId, slot.index, duration)) return false;
    const start = normalizeStart(s.trip, duration, slotAt(s.trip, slot.index));
    return slotIndex(s.trip, start.date, start.part) === slot.index;
  });
}

/**
 * Déplace une activité vers (équipe, créneau). Si l'équipe change, les participants deviennent
 * ceux d'avant qui sont dans la nouvelle équipe (sinon toute l'équipe). Null si le dépôt est refusé.
 */
export function movedEvent(
  s: TripState, eventId: string, teamId: string, idx: number,
): { event: TripEvent; participantIds?: string[] } | null {
  const e = s.events.find(x => x.id === eventId);
  if (!e || !canDrop(s, teamId, idx, e.duration)) return null;
  const start = normalizeStart(s.trip, e.duration, slotAt(s.trip, idx));
  const event = { ...e, team_id: teamId, start_date: start.date, start_part: start.part };
  if (teamId === e.team_id) return { event };
  const roster = rosterAt(s, teamId, slotIndex(s.trip, start.date, start.part));
  const current = s.event_participants.filter(p => p.event_id === e.id).map(p => p.person_id);
  const kept = roster.filter(p => current.includes(p));
  return { event, participantIds: kept.length ? kept : roster };
}
