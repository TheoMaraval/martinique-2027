import type { DurationKey, Team, TripEvent, TripState } from './types';
import type { UnplacedItem } from './unplaced';
import { SLOT_CAPACITY, buildSlots, type Slot, slotAt, slotIndex } from './slots';
import { canonicalDuration, isFlex, spanOf } from './durations';
import { rosterAt, teamCovers } from './teams';
import { eventSpan } from './conflicts';

/** Nombre d'activités de l'équipe occupant le créneau (en ignorant éventuellement une activité). */
function occupancy(s: TripState, teamId: string, idx: number, ignoreEventId?: string): number {
  return s.events.filter(e => e.team_id === teamId && e.id !== ignoreEventId && eventSpan(s, e).slots.includes(idx)).length;
}

/** Les créneaux sont planifiables, couverts par l'équipe et la capacité n'est dépassée sur aucun. */
function fits(s: TripState, team: Team, span: number[], ignoreEventId?: string): boolean {
  const slots = buildSlots(s.trip);
  return span.length > 0 && span.every(i => {
    const slot = slots[i];
    return !!slot?.plannable && teamCovers(s, team, i) && occupancy(s, team.id, i, ignoreEventId) < SLOT_CAPACITY[slot.part];
  });
}

/** Créneaux planifiables de idx à endIdx inclus (vide si endIdx < idx). */
function plannableRange(s: TripState, idx: number, endIdx: number): number[] {
  const slots = buildSlots(s.trip);
  const out: number[] = [];
  for (let i = idx; i <= endIdx; i++) if (slots[i]?.plannable) out.push(i);
  return out;
}

const endFields = (s: TripState, idx: number): Pick<TripEvent, 'end_date' | 'end_part'> => {
  const { date, part } = slotAt(s.trip, idx);
  return { end_date: date, end_part: part };
};

/**
 * Peut-on déposer une activité de cette durée au créneau idx pour l'équipe ?
 * Une activité simple occupe 1 créneau ; un multi-jours toute son emprise.
 * ignoreEventId : l'activité déplacée, qui ne compte pas dans la capacité.
 */
export function canDrop(s: TripState, teamId: string, idx: number, duration: DurationKey, ignoreEventId?: string): boolean {
  const team = s.teams.find(t => t.id === teamId);
  const slot = buildSlots(s.trip)[idx];
  if (!team || !slot?.plannable || !teamCovers(s, team, idx)) return false;
  const span = isFlex(duration) ? [idx] : spanOf(s.trip, duration, slotAt(s.trip, idx)).slots;
  return fits(s, team, span, ignoreEventId);
}

/** Peut-on étirer (ou réduire) l'activité simple jusqu'au créneau endIdx inclus ? */
export function canResize(s: TripState, eventId: string, endIdx: number): boolean {
  const e = s.events.find(x => x.id === eventId);
  const team = e && s.teams.find(t => t.id === e.team_id);
  if (!e || !team || !isFlex(e.duration)) return false;
  const start = slotIndex(s.trip, e.start_date, e.start_part);
  if (endIdx < start || !buildSlots(s.trip)[endIdx]?.plannable) return false;
  return fits(s, team, plannableRange(s, start, endIdx), e.id);
}

/** L'activité étirée jusqu'à endIdx, ou null si c'est refusé. */
export function resizedEvent(s: TripState, eventId: string, endIdx: number): TripEvent | null {
  const e = s.events.find(x => x.id === eventId);
  if (!e || !canResize(s, eventId, endIdx)) return null;
  return { ...e, ...endFields(s, endIdx) };
}

/** Fins possibles pour une activité simple : chaque créneau à partir du début tant que l'étirement est valide. */
export function resizeOptions(s: TripState, eventId: string): Slot[] {
  const e = s.events.find(x => x.id === eventId);
  if (!e || !isFlex(e.duration)) return [];
  const start = slotIndex(s.trip, e.start_date, e.start_part);
  const out: Slot[] = [];
  for (const slot of buildSlots(s.trip).slice(start)) {
    if (!slot.plannable) continue;
    if (!canResize(s, eventId, slot.index)) break;
    out.push(slot);
  }
  return out;
}

/** Activités de l'équipe dont au moins un créneau sort de la période de l'équipe. */
export function eventsOutsideTeam(s: TripState, team: Team): TripEvent[] {
  return s.events.filter(e => e.team_id === team.id && eventSpan(s, e).slots.some(i => !teamCovers(s, team, i)));
}

export function buildPlacedEvent(
  s: TripState, item: UnplacedItem, teamId: string, idx: number, id: string,
): { event: TripEvent; participantIds: string[] } {
  const start = slotAt(s.trip, idx);
  const roster = rosterAt(s, teamId, idx);
  const interested = roster.filter(p => item.personIds.includes(p));
  const end = isFlex(item.duration) ? endFields(s, idx) : { end_date: null, end_part: null };
  return {
    event: {
      id, trip_id: s.trip.id, team_id: teamId, activity_id: item.activity.id, duration: item.duration,
      occurrence: item.occurrence, start_date: start.date, start_part: start.part, ...end, place_name: '',
      lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '',
    },
    participantIds: interested.length ? interested : roster,
  };
}

/** Première occurrence libre pour (activité, durée) ; les anciens codes comptent comme 'flex'. */
export function nextOccurrence(s: TripState, activityId: string, duration: DurationKey): number {
  const key = canonicalDuration(duration);
  const used = new Set(
    s.events.filter(e => e.activity_id === activityId && canonicalDuration(e.duration) === key).map(e => e.occurrence),
  );
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

/** Créneaux de départ valides : tous ceux où l'activité peut être déposée. */
export function startOptions(s: TripState, teamId: string, duration: DurationKey, ignoreEventId?: string): Slot[] {
  return buildSlots(s.trip).filter(slot => canDrop(s, teamId, slot.index, duration, ignoreEventId));
}

/**
 * Déplace une activité vers (équipe, créneau). Une activité étirée garde sa longueur (même nombre de
 * créneaux) si possible, sinon elle revient à 1 créneau. Si l'équipe change, les participants deviennent
 * ceux d'avant qui sont dans la nouvelle équipe (sinon toute l'équipe). Null si le dépôt est refusé.
 */
export function movedEvent(
  s: TripState, eventId: string, teamId: string, idx: number,
): { event: TripEvent; participantIds?: string[] } | null {
  const e = s.events.find(x => x.id === eventId);
  const team = s.teams.find(t => t.id === teamId);
  if (!e || !team || !canDrop(s, teamId, idx, e.duration, e.id)) return null;
  const start = slotAt(s.trip, idx);
  let end: Pick<TripEvent, 'end_date' | 'end_part'> = { end_date: null, end_part: null };
  if (isFlex(e.duration)) {
    const length = Math.max(1, eventSpan(s, e).slots.length);
    const span = plannableRange(s, idx, buildSlots(s.trip).length - 1).slice(0, length);
    const endIdx = span.length === length && fits(s, team, span, e.id) ? span[span.length - 1] : idx;
    end = endFields(s, endIdx);
  }
  const event = { ...e, team_id: teamId, start_date: start.date, start_part: start.part, ...end };
  if (teamId === e.team_id) return { event };
  const roster = rosterAt(s, teamId, idx);
  const current = s.event_participants.filter(p => p.event_id === e.id).map(p => p.person_id);
  const kept = roster.filter(p => current.includes(p));
  return { event, participantIds: kept.length ? kept : roster };
}
