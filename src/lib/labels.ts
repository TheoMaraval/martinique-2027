import type { DurationKey, TripEvent, TripState } from '../domain/types';
import { durationLabel, isFlex } from '../domain/durations';
import { eventSpan } from '../domain/conflicts';
import { PART_LABEL, buildSlots } from '../domain/slots';
import { formatDay } from './format';

/** « Surf » pour une activité simple, « Bateau · 4j/3n » pour un séjour. */
export function withFormula(name: string, duration: DurationKey, sep = ' · '): string {
  const f = durationLabel(duration);
  return f ? `${name}${sep}${f}` : name;
}

/** Créneaux couverts par une activité simple étirée : « Matin → Après-midi » (jour précisé si plusieurs jours). */
export function spanLabel(s: TripState, e: TripEvent): string | null {
  if (!isFlex(e.duration)) return null;
  const span = eventSpan(s, e).slots;
  if (span.length < 2) return null;
  const slots = buildSlots(s.trip);
  const a = slots[span[0]];
  const b = slots[span[span.length - 1]];
  if (a.date === b.date) return `${PART_LABEL[a.part]} → ${PART_LABEL[b.part]}`;
  return `${formatDay(a.date)} ${PART_LABEL[a.part]} → ${formatDay(b.date)} ${PART_LABEL[b.part]}`;
}
