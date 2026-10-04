import { expensesByPerson, shareOf } from './expenses';
import { makeEvent, makeMeal, makeState, makeStay, participants } from '../test/fixtures';

describe('shareOf', () => {
  it('répartit un total ou garde un prix par personne', () => {
    expect(shareOf(null, 'total', 3)).toBe(0);
    expect(shareOf(300, 'total', 3)).toBe(100);
    expect(shareOf(45, 'per_person', 3)).toBe(45);
    expect(shareOf(300, 'total', 0)).toBe(0);
  });
});

describe('expensesByPerson', () => {
  it('somme logements, bateau et activités et compare au budget', () => {
    const base = makeState();
    const s = makeState({
      people: base.people.map(p => (p.id === 'p4' ? { ...p, budget_max: null } : p)),
      events: [
        makeEvent({ id: 'b', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', price: 2400, price_mode: 'total' }),
        makeEvent({ id: 's', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin', price: 45, price_mode: 'per_person' }),
      ],
      event_participants: [...participants('b', ['p1', 'p2', 'p3', 'p4']), ...participants('s', ['p1'])],
      stays: [
        makeStay({ id: 'st', night_date: '2027-04-15', price: 1000, price_mode: 'total' }),
        makeStay({ id: 'opt', night_date: '2027-04-15', price: 5000, price_mode: 'total', chosen: false }),
      ],
    });
    const rows = expensesByPerson(s);
    expect(rows.find(r => r.personId === 'p1')).toEqual({
      personId: 'p1', lodging: 250, boat: 600, activities: 45, total: 895, budget: 1000, delta: 105,
    });
    expect(rows.find(r => r.personId === 'p4')).toMatchObject({ total: 850, budget: null, delta: null });
  });
});

describe('expensesByPerson et repas', () => {
  it('ne compte jamais les repas, mais compte une activité placée au Midi', () => {
    const s = makeState({
      events: [makeEvent({ id: 'c', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'midi', price: 80, price_mode: 'total' })],
      event_participants: participants('c', ['p1', 'p2']),
      meals: [
        makeMeal({ id: 'm1', date: '2027-04-16', kind: 'dejeuner', price: 200, price_mode: 'total' }),
        makeMeal({ id: 'm2', date: '2027-04-16', kind: 'diner', price: 50, price_mode: 'per_person' }),
      ],
    });
    const rows = expensesByPerson(s);
    expect(rows.find(r => r.personId === 'p1')).toMatchObject({ activities: 40, lodging: 0, boat: 0, total: 40 });
    expect(rows.find(r => r.personId === 'p3')).toMatchObject({ total: 0 });
  });
});
