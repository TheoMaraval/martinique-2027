import type { Stay, TripEvent, TripState } from './types';
import { spanOf, type Span } from './durations';
import { nightDates, slotIndex } from './slots';
import { effectiveTeamIds, membersOf, teamRange } from './teams';

export type Alert =
  | { kind: 'overlap'; personId: string; eventIds: [string, string] }
  | { kind: 'two-teams'; personId: string; teamIds: [string, string] }
  | { kind: 'no-stay'; personId: string; night: string };

export function participantsOf(s: TripState, eventId: string): string[] {
  return s.event_participants.filter(p => p.event_id === eventId).map(p => p.person_id);
}

export function eventSpan(s: TripState, e: TripEvent): Span {
  return spanOf(s.trip, e.duration, { date: e.start_date, part: e.start_part });
}

/** Nuits couvertes par une activité multi-jours à laquelle la personne participe. */
export function includedNights(s: TripState, personId: string): Set<string> {
  const out = new Set<string>();
  for (const e of s.events) {
    if (participantsOf(s, e.id).includes(personId)) for (const n of eventSpan(s, e).nights) out.add(n);
  }
  return out;
}

/** Activité multi-jours de l'équipe qui couvre cette nuit (nuit « À bord » / « Incluse »). */
export function teamIncludedNight(s: TripState, teamId: string, night: string): TripEvent | undefined {
  return s.events.find(e => e.team_id === teamId && eventSpan(s, e).nights.includes(night));
}

export function stayFor(s: TripState, personId: string, night: string): Stay | undefined {
  const teamIds = effectiveTeamIds(s, personId, slotIndex(s.trip, night, 'soir'));
  return s.stays.find(st => st.chosen && st.night_date === night && teamIds.includes(st.team_id));
}

export function computeAlerts(s: TripState): Alert[] {
  const alerts: Alert[] = [];
  const nights = nightDates(s.trip);
  for (const person of s.people) {
    const evs = s.events
      .filter(e => participantsOf(s, e.id).includes(person.id))
      .map(e => ({ e, slots: new Set(eventSpan(s, e).slots) }));
    for (let i = 0; i < evs.length; i++) {
      for (let j = i + 1; j < evs.length; j++) {
        if ([...evs[i].slots].some(x => evs[j].slots.has(x))) {
          alerts.push({ kind: 'overlap', personId: person.id, eventIds: [evs[i].e.id, evs[j].e.id] });
        }
      }
    }
    const teams = s.teams.filter(t => !t.is_default && membersOf(s, t.id).includes(person.id));
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const [a1, b1] = teamRange(s, teams[i]);
        const [a2, b2] = teamRange(s, teams[j]);
        if (a1 <= b2 && a2 <= b1) alerts.push({ kind: 'two-teams', personId: person.id, teamIds: [teams[i].id, teams[j].id] });
      }
    }
    const included = includedNights(s, person.id);
    for (const night of nights) {
      if (!included.has(night) && !stayFor(s, person.id, night)) alerts.push({ kind: 'no-stay', personId: person.id, night });
    }
  }
  return alerts;
}
