import type { DurationKey, Part, Trip } from './types';
import { PARTS, addDays, buildSlots, lastSlotOfDay, nightDates, slotIndex } from './slots';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;
type SlotRef = { date: string; part: Part };

/** 'flex' : activité simple (1 créneau, étirable) ; 'multi' : séjour de plusieurs jours. */
export type ParsedDuration =
  | { kind: 'flex' }
  | { kind: 'multi'; days: number; nights: number };

export interface Span { slots: number[]; nights: string[] }

export const FLEX: DurationKey = 'flex';
/** Anciens codes (avant la v2), lus comme 'flex' par sécurité. */
const LEGACY_LABEL = new Map([['half', 'Demi-journée'], ['day', 'Journée'], ['evening', 'Soir']]);

export function parseDuration(key: DurationKey): ParsedDuration {
  if (key === FLEX || LEGACY_LABEL.has(key)) return { kind: 'flex' };
  const m = /^multi:(\d+):(\d+)$/.exec(key);
  if (m) return { kind: 'multi', days: Number(m[1]), nights: Number(m[2]) };
  throw new Error(`Durée inconnue : ${key}`);
}

export const isFlex = (key: DurationKey): boolean => parseDuration(key).kind === 'flex';

/** Clé canonique : 'flex' pour toute activité simple (anciens codes compris), sinon la formule multi. */
export const canonicalDuration = (key: DurationKey): DurationKey => (isFlex(key) ? FLEX : key);

export const multiKey = (days: number, nights: number): DurationKey => `multi:${days}:${nights}`;

const FLEX_RANK = new Map([['flex', 0], ['half', 1], ['day', 2], ['evening', 3]]);

/** Ordre canonique : activité simple d'abord, puis multi-jours triés par jours puis nuits. */
export function compareDurations(a: DurationKey, b: DurationKey): number {
  const pa = parseDuration(a);
  const pb = parseDuration(b);
  if (pa.kind === 'flex' && pb.kind === 'flex') return FLEX_RANK.get(a)! - FLEX_RANK.get(b)!;
  if (pa.kind === 'flex') return -1;
  if (pb.kind === 'flex') return 1;
  return pa.days - pb.days || pa.nights - pb.nights;
}

/** Libellé de la formule : vide pour une activité simple (l'interface n'affiche rien). */
export function durationLabel(key: DurationKey): string {
  const p = parseDuration(key);
  if (p.kind === 'flex') return LEGACY_LABEL.get(key) ?? '';
  return `${p.days}j/${p.nights}n`;
}

/**
 * Emprise d'une activité. flex : du début à la fin incluse (sans fin, ou fin avant le début → 1 créneau).
 * multi : du créneau de départ jusqu'au soir du jour J, nuits incluses (la fin est ignorée).
 * Seuls les créneaux planifiables et les nuits du voyage sont gardés.
 */
export function spanOf(trip: TripDates, key: DurationKey, start: SlotRef, end?: SlotRef | null): Span {
  const p = parseDuration(key);
  const i = slotIndex(trip, start.date, start.part);
  let last = i;
  let nights: string[] = [];
  if (p.kind === 'flex') {
    if (end) last = Math.max(i, slotIndex(trip, end.date, end.part));
  } else {
    last = lastSlotOfDay(i) + (p.days - 1) * PARTS.length;
    nights = Array.from({ length: p.nights }, (_, k) => addDays(start.date, k));
  }
  const all = buildSlots(trip);
  const validNights = new Set(nightDates(trip));
  return {
    slots: Array.from({ length: last - i + 1 }, (_, k) => i + k).filter(x => all[x]?.plannable),
    nights: nights.filter(n => validNights.has(n)),
  };
}
