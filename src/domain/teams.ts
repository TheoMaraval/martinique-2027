import type { Team, TripState } from './types';
import { slotIndex } from './slots';

export function teamRange(s: TripState, t: Team): [number, number] {
  return [slotIndex(s.trip, t.start_date, t.start_part), slotIndex(s.trip, t.end_date, t.end_part)];
}

export function teamCovers(s: TripState, t: Team, idx: number): boolean {
  const [a, b] = teamRange(s, t);
  return idx >= a && idx <= b;
}

export function defaultTeam(s: TripState): Team {
  const t = s.teams.find(x => x.is_default);
  if (!t) throw new Error('Équipe par défaut manquante');
  return t;
}

export function membersOf(s: TripState, teamId: string): string[] {
  return s.team_members.filter(m => m.team_id === teamId).map(m => m.person_id);
}

/** Équipes non-défaut couvrant le créneau et contenant la personne ; sinon l'équipe par défaut. */
export function effectiveTeamIds(s: TripState, personId: string, idx: number): string[] {
  const ids = s.teams
    .filter(t => !t.is_default && teamCovers(s, t, idx) && membersOf(s, t.id).includes(personId))
    .map(t => t.id);
  return ids.length ? ids : [defaultTeam(s).id];
}

export function rosterAt(s: TripState, teamId: string, idx: number): string[] {
  const team = s.teams.find(t => t.id === teamId);
  if (!team) return [];
  if (!team.is_default) return teamCovers(s, team, idx) ? membersOf(s, team.id) : [];
  return s.people.filter(p => effectiveTeamIds(s, p.id, idx).includes(team.id)).map(p => p.id);
}

export function teamsOnDay(s: TripState, date: string): Team[] {
  const first = slotIndex(s.trip, date, 'matin');
  const last = first + 2;
  const others = s.teams
    .filter(t => !t.is_default)
    .filter(t => {
      const [a, b] = teamRange(s, t);
      return a <= last && b >= first;
    })
    .sort((x, y) => teamRange(s, x)[0] - teamRange(s, y)[0] || x.name.localeCompare(y.name, 'fr'));
  return [defaultTeam(s), ...others];
}
