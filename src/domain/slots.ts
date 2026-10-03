import type { Part, Trip } from './types';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;

export const PARTS: Part[] = ['matin', 'aprem', 'soir'];
export const PART_LABEL: Record<Part, string> = { matin: 'Matin', aprem: 'Après-midi', soir: 'Soir' };

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

/** Le premier matin (vol aller) et les après-midi/soir du dernier jour (départ) ne sont pas planifiables. */
export function buildSlots(trip: TripDates): Slot[] {
  const dates = tripDates(trip);
  const last = dates.length - 1;
  return dates.flatMap((date, di) =>
    PARTS.map((part, pi): Slot => {
      const index = di * 3 + pi;
      if (di === 0 && part === 'matin') return { index, date, part, plannable: false, blockedLabel: 'Vol aller' };
      if (di === last && part !== 'matin') return { index, date, part, plannable: false, blockedLabel: 'Départ' };
      return { index, date, part, plannable: true };
    }),
  );
}

export function slotIndex(trip: TripDates, date: string, part: Part): number {
  const di = tripDates(trip).indexOf(date);
  if (di < 0) throw new Error(`Date hors voyage : ${date}`);
  return di * 3 + PARTS.indexOf(part);
}

export function slotAt(trip: TripDates, index: number): { date: string; part: Part } {
  return { date: addDays(trip.start_date, Math.floor(index / 3)), part: PARTS[index % 3] };
}

export function isPlannable(trip: TripDates, index: number): boolean {
  return buildSlots(trip)[index]?.plannable ?? false;
}

export function nightDates(trip: TripDates): string[] {
  return tripDates(trip).slice(0, -1);
}
