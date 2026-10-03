import type { Stay, Team, TripEvent, TripState } from './types';
import { PARTS, nightDates, slotIndex, tripDates } from './slots';
import { rosterAt, teamsOnDay } from './teams';
import { eventSpan, participantsOf, teamIncludedNight } from './conflicts';

export interface DayEntry {
  team: Team; roster: string[]; events: TripEvent[]; stay: Stay | undefined; includedBy: TripEvent | undefined;
}
export interface DayPlan { date: string; entries: DayEntry[] }
export interface RoutePoint { id: string; lat: number; lng: number; label: string; color: string; teamId: string }

export function itinerary(s: TripState, personId: string | null): DayPlan[] {
  const nights = new Set(nightDates(s.trip));
  return tripDates(s.trip).map(date => {
    const dayIdx = PARTS.map(p => slotIndex(s.trip, date, p));
    const entries = teamsOnDay(s, date)
      .map((team): DayEntry => {
        const roster = [...new Set(dayIdx.flatMap(i => rosterAt(s, team.id, i)))];
        const events = s.events
          .filter(e => e.team_id === team.id && eventSpan(s, e).slots.some(i => dayIdx.includes(i)))
          .filter(e => !personId || participantsOf(s, e.id).includes(personId))
          .sort((a, b) => slotIndex(s.trip, a.start_date, a.start_part) - slotIndex(s.trip, b.start_date, b.start_part));
        let stay: Stay | undefined;
        let includedBy: TripEvent | undefined;
        if (nights.has(date)) {
          const nightRoster = rosterAt(s, team.id, dayIdx[2]);
          if (!personId || nightRoster.includes(personId)) {
            stay = s.stays.find(st => st.chosen && st.team_id === team.id && st.night_date === date);
          }
          const inc = teamIncludedNight(s, team.id, date);
          if (inc && (!personId || participantsOf(s, inc.id).includes(personId))) includedBy = inc;
        }
        return { team, roster, events, stay, includedBy };
      })
      .filter(en => en.events.length > 0 || en.stay || en.includedBy);
    return { date, entries };
  });
}

export function routePoints(s: TripState, personId: string | null): RoutePoint[] {
  const seen = new Set<string>();
  const out: RoutePoint[] = [];
  const activityName = (e: TripEvent) => s.activities.find(a => a.id === e.activity_id)?.name ?? 'Activité';
  for (const day of itinerary(s, personId)) {
    for (const en of day.entries) {
      for (const e of en.events) {
        if (e.lat == null || e.lng == null || seen.has(e.id)) continue;
        seen.add(e.id);
        out.push({ id: e.id, lat: e.lat, lng: e.lng, label: e.place_name || activityName(e), color: en.team.color, teamId: en.team.id });
      }
      const st = en.stay;
      if (st && st.lat != null && st.lng != null && !seen.has(st.id)) {
        seen.add(st.id);
        out.push({ id: st.id, lat: st.lat, lng: st.lng, label: st.place_name || 'Logement', color: en.team.color, teamId: en.team.id });
      }
    }
  }
  return out;
}
