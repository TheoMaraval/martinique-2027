import type { Activity, DurationKey, TripState, Wish } from './types';

export interface UnplacedItem {
  key: string; activity: Activity; duration: DurationKey; occurrence: number; personIds: string[];
}

export const placementKey = (activityId: string, duration: DurationKey, occurrence: number) =>
  `${activityId}|${duration}|${occurrence}`;

/** Multiplicateur de succès ×N : nombre de personnes distinctes ayant suggéré l'activité (toutes durées). */
export function popularity(s: TripState): Map<string, number> {
  const people = new Map<string, Set<string>>();
  for (const w of s.wishes) people.set(w.activity_id, (people.get(w.activity_id) ?? new Set<string>()).add(w.person_id));
  return new Map([...people].map(([id, set]) => [id, set.size]));
}

export function unplacedItems(s: TripState): UnplacedItem[] {
  const groups = new Map<string, Wish[]>();
  for (const w of s.wishes) {
    const k = `${w.activity_id}|${w.duration}`;
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }
  const placed = new Set(s.events.map(e => placementKey(e.activity_id, e.duration, e.occurrence)));
  const items: UnplacedItem[] = [];
  for (const ws of groups.values()) {
    const activity = s.activities.find(a => a.id === ws[0].activity_id);
    if (!activity) continue;
    const qty = (w: Wish) => (activity.has_quantity ? w.quantity : 1);
    const max = Math.max(...ws.map(qty));
    for (let occ = 1; occ <= max; occ++) {
      const key = placementKey(activity.id, ws[0].duration, occ);
      if (placed.has(key)) continue;
      items.push({
        key, activity, duration: ws[0].duration, occurrence: occ,
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
