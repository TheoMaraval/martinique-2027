import type { DurationKey, Part, Trip } from './types';
import { addDays, buildSlots, isPlannable, nightDates, slotIndex } from './slots';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;
type Start = { date: string; part: Part };

export type ParsedDuration =
  | { kind: 'half' }
  | { kind: 'day' }
  | { kind: 'evening' }
  | { kind: 'multi'; days: number; nights: number };

export interface Span { slots: number[]; nights: string[] }

export function parseDuration(key: DurationKey): ParsedDuration {
  if (key === 'half' || key === 'day' || key === 'evening') return { kind: key };
  const m = /^multi:(\d+):(\d+)$/.exec(key);
  if (m) return { kind: 'multi', days: Number(m[1]), nights: Number(m[2]) };
  throw new Error(`Durée inconnue : ${key}`);
}

export const multiKey = (days: number, nights: number): DurationKey => `multi:${days}:${nights}`;

const DURATION_RANK: Record<string, number> = { half: 0, day: 1, evening: 2 };

/** Ordre canonique : half, day, evening, puis multi-jours triés par jours puis nuits. */
export function compareDurations(a: DurationKey, b: DurationKey): number {
  const pa = parseDuration(a);
  const pb = parseDuration(b);
  if (pa.kind !== 'multi' && pb.kind !== 'multi') return DURATION_RANK[pa.kind] - DURATION_RANK[pb.kind];
  if (pa.kind !== 'multi') return -1;
  if (pb.kind !== 'multi') return 1;
  return pa.days - pb.days || pa.nights - pb.nights;
}

export function durationLabel(key: DurationKey): string {
  const p = parseDuration(key);
  if (p.kind === 'half') return 'Demi-journée';
  if (p.kind === 'day') return 'Journée';
  if (p.kind === 'evening') return 'Soir';
  return `${p.days}j/${p.nights}n`;
}

export function normalizeStart(trip: TripDates, key: DurationKey, start: Start): Start {
  const p = parseDuration(key);
  if (p.kind === 'evening') return { date: start.date, part: 'soir' };
  if (p.kind === 'day') {
    const morningOk = isPlannable(trip, slotIndex(trip, start.date, 'matin'));
    return { date: start.date, part: morningOk ? 'matin' : 'aprem' };
  }
  return start;
}

export function spanOf(trip: TripDates, key: DurationKey, start: Start): Span {
  const p = parseDuration(key);
  const s = normalizeStart(trip, key, start);
  const i = slotIndex(trip, s.date, s.part);
  let slots: number[];
  let nights: string[] = [];
  if (p.kind === 'half' || p.kind === 'evening') {
    slots = [i];
  } else if (p.kind === 'day') {
    slots = [slotIndex(trip, s.date, 'matin'), slotIndex(trip, s.date, 'aprem')];
  } else {
    const end = (Math.floor(i / 3) + p.days - 1) * 3 + 2;
    slots = Array.from({ length: end - i + 1 }, (_, k) => i + k);
    nights = Array.from({ length: p.nights }, (_, k) => addDays(s.date, k));
  }
  const all = buildSlots(trip);
  const validNights = new Set(nightDates(trip));
  return {
    slots: slots.filter(x => all[x]?.plannable),
    nights: nights.filter(n => validNights.has(n)),
  };
}
