import type { PriceMode, TripState } from './types';
import { participantsOf } from './conflicts';
import { rosterAt } from './teams';
import { slotIndex } from './slots';

export interface PersonExpense {
  personId: string; lodging: number; boat: number; activities: number; total: number;
  budget: number | null; delta: number | null;
}

export const BOAT_CATEGORY = 'Bateau';

export function shareOf(price: number | null, mode: PriceMode, n: number): number {
  if (!price || n <= 0) return 0;
  return mode === 'total' ? price / n : price;
}

const round = (x: number) => Math.round(x * 100) / 100;

export function expensesByPerson(s: TripState): PersonExpense[] {
  const acc = new Map(s.people.map(p => [p.id, { lodging: 0, boat: 0, activities: 0 }]));
  for (const e of s.events) {
    const ps = participantsOf(s, e.id);
    const amount = shareOf(e.price, e.price_mode, ps.length);
    const isBoat = s.activities.find(a => a.id === e.activity_id)?.category === BOAT_CATEGORY;
    for (const p of ps) {
      const row = acc.get(p);
      if (row) isBoat ? (row.boat += amount) : (row.activities += amount);
    }
  }
  for (const st of s.stays.filter(x => x.chosen)) {
    const ps = rosterAt(s, st.team_id, slotIndex(s.trip, st.night_date, 'soir'));
    const amount = shareOf(st.price, st.price_mode, ps.length);
    for (const p of ps) {
      const row = acc.get(p);
      if (row) row.lodging += amount;
    }
  }
  return s.people.map(p => {
    const r = acc.get(p.id)!;
    const total = round(round(r.lodging) + round(r.boat) + round(r.activities));
    return {
      personId: p.id, lodging: round(r.lodging), boat: round(r.boat), activities: round(r.activities), total,
      budget: p.budget_max, delta: p.budget_max == null ? null : round(p.budget_max - total),
    };
  });
}
