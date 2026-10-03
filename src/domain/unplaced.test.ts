import { popularity, unplacedItems } from './unplaced';
import { makeEvent, makeState } from '../test/fixtures';
import type { Wish } from './types';

const wish = (id: string, person_id: string, activity_id: string, duration: string, quantity = 1): Wish =>
  ({ id, trip_id: 'trip', person_id, activity_id, duration, quantity });

const wishes = [
  wish('w1', 'p1', 'surf', 'half'), wish('w2', 'p2', 'surf', 'half'), wish('w3', 'p3', 'surf', 'half'),
  wish('w4', 'p1', 'rando', 'half', 2), wish('w5', 'p2', 'rando', 'half', 1),
  wish('w6', 'p4', 'boat', 'multi:4:3'),
];

describe('popularity', () => {
  it('compte les personnes distinctes par activité (×N)', () => {
    const extra = [...wishes, wish('w7', 'p1', 'rando', 'day')];
    const pop = popularity(makeState({ wishes: extra }));
    expect(pop.get('surf')).toBe(3);
    expect(pop.get('rando')).toBe(2);
    expect(pop.get('boat')).toBe(1);
  });
});

describe('unplacedItems', () => {
  it('groupe, éclate les quantités et trie par suggestions puis par succès ×N', () => {
    const items = unplacedItems(makeState({ wishes }));
    expect(items.map(i => [i.activity.id, i.occurrence, i.personIds])).toEqual([
      ['surf', 1, ['p1', 'p2', 'p3']],
      ['rando', 1, ['p1', 'p2']],
      ['rando', 2, ['p1']],
      ['boat', 1, ['p4']],
    ]);
  });

  it('retire les éléments déjà placés', () => {
    const events = [makeEvent({ id: 'e1', activity_id: 'rando', duration: 'half', occurrence: 1, start_date: '2027-04-16', start_part: 'matin' })];
    const items = unplacedItems(makeState({ wishes, events }));
    expect(items.map(i => `${i.activity.id}#${i.occurrence}`)).toEqual(['surf#1', 'rando#2', 'boat#1']);
  });

  it('ignore la quantité si l’activité n’en a pas', () => {
    const items = unplacedItems(makeState({ wishes: [wish('w', 'p1', 'surf', 'day', 3)] }));
    expect(items).toHaveLength(1);
  });
});
