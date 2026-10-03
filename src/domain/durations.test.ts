import { compareDurations, durationLabel, multiKey, normalizeStart, parseDuration, spanOf } from './durations';
import { TRIP } from '../test/fixtures';

describe('durations', () => {
  it('parse les codes', () => {
    expect(parseDuration('half')).toEqual({ kind: 'half' });
    expect(parseDuration('multi:4:3')).toEqual({ kind: 'multi', days: 4, nights: 3 });
    expect(() => parseDuration('xx')).toThrow();
  });

  it('libellés', () => {
    expect(durationLabel('half')).toBe('Demi-journée');
    expect(durationLabel('day')).toBe('Journée');
    expect(durationLabel('evening')).toBe('Soir');
    expect(durationLabel(multiKey(3, 2))).toBe('3j/2n');
  });

  it('normalise le départ', () => {
    expect(normalizeStart(TRIP, 'day', { date: '2027-04-16', part: 'soir' })).toEqual({ date: '2027-04-16', part: 'matin' });
    expect(normalizeStart(TRIP, 'day', { date: '2027-04-15', part: 'soir' })).toEqual({ date: '2027-04-15', part: 'aprem' });
    expect(normalizeStart(TRIP, 'evening', { date: '2027-04-16', part: 'matin' })).toEqual({ date: '2027-04-16', part: 'soir' });
    expect(normalizeStart(TRIP, 'half', { date: '2027-04-16', part: 'aprem' })).toEqual({ date: '2027-04-16', part: 'aprem' });
  });

  it('emprise demi-journée et soir', () => {
    expect(spanOf(TRIP, 'half', { date: '2027-04-16', part: 'aprem' })).toEqual({ slots: [4], nights: [] });
    expect(spanOf(TRIP, 'evening', { date: '2027-04-16', part: 'matin' })).toEqual({ slots: [5], nights: [] });
  });

  it('emprise journée (le 15 matin est bloqué)', () => {
    expect(spanOf(TRIP, 'day', { date: '2027-04-16', part: 'matin' }).slots).toEqual([3, 4]);
    expect(spanOf(TRIP, 'day', { date: '2027-04-15', part: 'matin' }).slots).toEqual([1]);
  });

  it('emprise bateau 4j/3n', () => {
    const s = spanOf(TRIP, 'multi:4:3', { date: '2027-04-17', part: 'matin' });
    expect(s.slots).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(s.nights).toEqual(['2027-04-17', '2027-04-18', '2027-04-19']);
  });

  it('coupe ce qui dépasse le voyage', () => {
    const s = spanOf(TRIP, 'multi:3:3', { date: '2027-04-23', part: 'matin' });
    expect(s.slots).toEqual([24, 25, 26, 27, 28, 29, 30]);
    expect(s.nights).toEqual(['2027-04-23', '2027-04-24']);
  });
});

it('trie les durées dans l ordre canonique', () => {
  expect(['multi:3:2', 'evening', 'multi:2:2', 'day', 'multi:2:1', 'half'].sort(compareDurations))
    .toEqual(['half', 'day', 'evening', 'multi:2:1', 'multi:2:2', 'multi:3:2']);
});
