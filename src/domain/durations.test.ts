import { canonicalDuration, compareDurations, durationLabel, isFlex, multiKey, parseDuration, spanOf } from './durations';
import { TRIP } from '../test/fixtures';

describe('durations', () => {
  it('parse les codes, les anciens codes étant lus comme « flex »', () => {
    expect(parseDuration('flex')).toEqual({ kind: 'flex' });
    expect(parseDuration('half')).toEqual({ kind: 'flex' });
    expect(parseDuration('day')).toEqual({ kind: 'flex' });
    expect(parseDuration('evening')).toEqual({ kind: 'flex' });
    expect(parseDuration('multi:4:3')).toEqual({ kind: 'multi', days: 4, nights: 3 });
    expect(() => parseDuration('xx')).toThrow();
  });

  it('ramène les clés à leur forme canonique', () => {
    expect(canonicalDuration('half')).toBe('flex');
    expect(canonicalDuration('evening')).toBe('flex');
    expect(canonicalDuration('flex')).toBe('flex');
    expect(canonicalDuration('multi:3:2')).toBe('multi:3:2');
    expect(isFlex('day')).toBe(true);
    expect(isFlex('multi:3:2')).toBe(false);
  });

  it('libellés : aucun pour une activité simple, formule pour le multi-jours', () => {
    expect(durationLabel('flex')).toBe('');
    expect(durationLabel(multiKey(3, 2))).toBe('3j/2n');
    // Anciens codes (n'existent plus après migration) : libellé historique conservé.
    expect(durationLabel('half')).toBe('Demi-journée');
    expect(durationLabel('day')).toBe('Journée');
    expect(durationLabel('evening')).toBe('Soir');
  });

  it('emprise flex : 1 créneau sans fin', () => {
    expect(spanOf(TRIP, 'flex', { date: '2027-04-16', part: 'aprem' })).toEqual({ slots: [6], nights: [] });
    expect(spanOf(TRIP, 'half', { date: '2027-04-16', part: 'midi' })).toEqual({ slots: [5], nights: [] });
  });

  it('emprise flex étirée jusqu’à la fin incluse', () => {
    expect(spanOf(TRIP, 'flex', { date: '2027-04-16', part: 'matin' }, { date: '2027-04-16', part: 'aprem' }).slots).toEqual([4, 5, 6]);
    expect(spanOf(TRIP, 'flex', { date: '2027-04-16', part: 'soir' }, { date: '2027-04-17', part: 'matin' }).slots).toEqual([7, 8]);
  });

  it('emprise flex : une fin avant le début est ignorée', () => {
    expect(spanOf(TRIP, 'flex', { date: '2027-04-16', part: 'aprem' }, { date: '2027-04-16', part: 'matin' }).slots).toEqual([6]);
  });

  it('emprise flex : seuls les créneaux planifiables comptent', () => {
    expect(spanOf(TRIP, 'flex', { date: '2027-04-25', part: 'matin' }, { date: '2027-04-25', part: 'soir' }).slots).toEqual([40, 41]);
  });

  it('emprise bateau 4j/3n, Midi compris', () => {
    const s = spanOf(TRIP, 'multi:4:3', { date: '2027-04-17', part: 'matin' });
    expect(s.slots).toEqual(Array.from({ length: 16 }, (_, k) => 8 + k));
    expect(s.nights).toEqual(['2027-04-17', '2027-04-18', '2027-04-19']);
  });

  it('emprise multi : la fin éventuelle est ignorée', () => {
    const s = spanOf(TRIP, 'multi:2:1', { date: '2027-04-17', part: 'aprem' }, { date: '2027-04-17', part: 'aprem' });
    expect(s.slots).toEqual([10, 11, 12, 13, 14, 15]);
  });

  it('coupe ce qui dépasse le voyage', () => {
    const s = spanOf(TRIP, 'multi:3:3', { date: '2027-04-23', part: 'matin' });
    expect(s.slots).toEqual([32, 33, 34, 35, 36, 37, 38, 39, 40, 41]);
    expect(s.nights).toEqual(['2027-04-23', '2027-04-24']);
  });
});

it('trie les durées : activité simple d’abord, puis multi-jours', () => {
  expect(['multi:3:2', 'flex', 'multi:2:2', 'multi:2:1'].sort(compareDurations))
    .toEqual(['flex', 'multi:2:1', 'multi:2:2', 'multi:3:2']);
  expect(['multi:3:2', 'evening', 'day', 'half', 'flex'].sort(compareDurations))
    .toEqual(['flex', 'half', 'day', 'evening', 'multi:3:2']);
});
