import type { Part, Trip } from './types';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;

export const PARTS: Part[] = ['matin', 'midi', 'aprem', 'soir'];
export const PART_LABEL: Record<Part, string> = { matin: 'Matin', midi: 'Midi', aprem: 'Après-midi', soir: 'Soir' };
const PER_DAY = PARTS.length;

/** Nombre maximal d'activités par équipe et par créneau (et par personne, pour les alertes). Les activités d'un même créneau se suivent : pas d'alerte entre elles tant que la capacité tient. */
export const SLOT_CAPACITY: Record<Part, number> = { matin: 3, midi: 3, aprem: 3, soir: 3 };

export interface Slot { index: number; date: string; part: Part; plannable: boolean; blockedLabel?: string }

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function tripDates(trip: TripDates): string[] {
  const out: string[] = [];
  for (let d = trip.start_date; d <= trip.end_date; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Premier jour : Matin et Midi bloqués (vol aller, arrivée 13:00).
 * Dernier jour : Après-midi et Soir bloqués (départ, vol 16:20).
 */
export function buildSlots(trip: TripDates): Slot[] {
  const dates = tripDates(trip);
  const last = dates.length - 1;
  return dates.flatMap((date, di) =>
    PARTS.map((part, pi): Slot => {
      const index = di * PER_DAY + pi;
      if (di === 0 && (part === 'matin' || part === 'midi')) return { index, date, part, plannable: false, blockedLabel: 'Vol aller' };
      if (di === last && (part === 'aprem' || part === 'soir')) return { index, date, part, plannable: false, blockedLabel: 'Départ' };
      return { index, date, part, plannable: true };
    }),
  );
}

export function slotIndex(trip: TripDates, date: string, part: Part): number {
  const di = tripDates(trip).indexOf(date);
  if (di < 0) throw new Error(`Date hors voyage : ${date}`);
  return di * PER_DAY + PARTS.indexOf(part);
}

export function slotAt(trip: TripDates, index: number): { date: string; part: Part } {
  return { date: addDays(trip.start_date, Math.floor(index / PER_DAY)), part: PARTS[index % PER_DAY] };
}

/** Index du dernier créneau (soir) du jour contenant `index`. */
export function lastSlotOfDay(index: number): number {
  return Math.floor(index / PER_DAY) * PER_DAY + PER_DAY - 1;
}

export function isPlannable(trip: TripDates, index: number): boolean {
  return buildSlots(trip)[index]?.plannable ?? false;
}

export function nightDates(trip: TripDates): string[] {
  return tripDates(trip).slice(0, -1);
}
