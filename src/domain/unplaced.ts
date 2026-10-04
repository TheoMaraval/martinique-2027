import type { Activity, DurationKey, TripState, Wish } from './types';
import { allowsQuantity, canonicalDuration } from './durations';

export interface UnplacedItem {
  key: string; activity: Activity; duration: DurationKey; occurrence: number; total: number; personIds: string[];
}

/** Clé de placement ; les anciens codes de durée sont ramenés à 'flex'. */
export const placementKey = (activityId: string, duration: DurationKey, occurrence: number) =>
  `${activityId}|${canonicalDuration(duration)}|${occurrence}`;

/** Multiplicateur de succès ×N : nombre de personnes distinctes ayant suggéré l'activité (toutes durées). */
export function popularity(s: TripState): Map<string, number> {
  const people = new Map<string, Set<string>>();
  for (const w of s.wishes) people.set(w.activity_id, (people.get(w.activity_id) ?? new Set<string>()).add(w.person_id));
  return new Map([...people].map(([id, set]) => [id, set.size]));
}

export function unplacedItems(s: TripState): UnplacedItem[] {
  // Groupes (activité, durée canonique) ; une seule envie par personne (quantité max) dans un groupe.
  const groups = new Map<string, { duration: DurationKey; byPerson: Map<string, Wish> }>();
  for (const w of s.wishes) {
    const duration = canonicalDuration(w.duration);
    const k = `${w.activity_id}|${duration}`;
    const g = groups.get(k) ?? { duration, byPerson: new Map<string, Wish>() };
    const prev = g.byPerson.get(w.person_id);
    if (!prev || w.quantity > prev.quantity) g.byPerson.set(w.person_id, w);
    groups.set(k, g);
  }
  const placed = new Set(s.events.map(e => placementKey(e.activity_id, e.duration, e.occurrence)));
  const items: UnplacedItem[] = [];
  for (const { duration, byPerson } of groups.values()) {
    const ws = [...byPerson.values()];
    const activity = s.activities.find(a => a.id === ws[0].activity_id);
    if (!activity) continue;
    const qty = (w: Wish) => (allowsQuantity(duration) ? w.quantity : 1);
    const max = Math.max(...ws.map(qty));
    for (let occ = 1; occ <= max; occ++) {
      const key = placementKey(activity.id, duration, occ);
      if (placed.has(key)) continue;
      items.push({
        key, activity, duration, occurrence: occ, total: max,
        personIds: ws.filter(w => qty(w) >= occ).map(w => w.person_id),
      });
    }
  }
  const pop = popularity(s);
  return items.sort(
    (a, b) =>
      b.personIds.length - a.personIds.length ||
      (pop.get(b.activity.id) ?? 0) - (pop.get(a.activity.id) ?? 0) ||
      a.activity.name.localeCompare(b.activity.name, 'fr') ||
      a.occurrence - b.occurrence,
  );
}
