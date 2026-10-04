import { PARTS, PART_LABEL, SLOT_CAPACITY, addDays, buildSlots, nightDates, slotAt, slotIndex, tripDates } from './slots';
import { TRIP } from '../test/fixtures';

describe('slots', () => {
  it('liste les 11 jours du voyage', () => {
    const d = tripDates(TRIP);
    expect(d).toHaveLength(11);
    expect(d[0]).toBe('2027-04-15');
    expect(d[10]).toBe('2027-04-25');
  });

  it('addDays traverse les mois', () => {
    expect(addDays('2027-04-30', 1)).toBe('2027-05-01');
  });

  it('a 4 moments par jour, Midi compris', () => {
    expect(PARTS).toEqual(['matin', 'midi', 'aprem', 'soir']);
    expect(PARTS.map(p => PART_LABEL[p])).toEqual(['Matin', 'Midi', 'Après-midi', 'Soir']);
  });

  it('construit 44 créneaux avec les vols bloqués', () => {
    const s = buildSlots(TRIP);
    expect(s).toHaveLength(44);
    expect(s[0]).toMatchObject({ date: '2027-04-15', part: 'matin', plannable: false, blockedLabel: 'Vol aller' });
    expect(s[1]).toMatchObject({ date: '2027-04-15', part: 'midi', plannable: false, blockedLabel: 'Vol aller' });
    expect(s[2]).toMatchObject({ date: '2027-04-15', part: 'aprem', plannable: true });
    expect(s[40]).toMatchObject({ date: '2027-04-25', part: 'matin', plannable: true });
    expect(s[41]).toMatchObject({ date: '2027-04-25', part: 'midi', plannable: true });
    expect(s[42]).toMatchObject({ part: 'aprem', plannable: false, blockedLabel: 'Départ' });
    expect(s[43]).toMatchObject({ part: 'soir', plannable: false, blockedLabel: 'Départ' });
    expect(s.filter(x => x.plannable)).toHaveLength(40);
  });

  it('convertit date/moment <-> index (jour*4 + rang)', () => {
    expect(slotIndex(TRIP, '2027-04-16', 'soir')).toBe(7);
    expect(slotIndex(TRIP, '2027-04-16', 'midi')).toBe(5);
    expect(slotAt(TRIP, 7)).toEqual({ date: '2027-04-16', part: 'soir' });
    expect(slotAt(TRIP, 5)).toEqual({ date: '2027-04-16', part: 'midi' });
  });

  it('capacité par équipe : 3 activités dans chaque créneau', () => {
    expect(SLOT_CAPACITY).toEqual({ matin: 3, midi: 3, aprem: 3, soir: 3 });
  });

  it('refuse une date hors voyage', () => {
    expect(() => slotIndex(TRIP, '2027-05-01', 'matin')).toThrow();
  });

  it('compte 10 nuits du 15 au 24', () => {
    const n = nightDates(TRIP);
    expect(n).toHaveLength(10);
    expect(n[0]).toBe('2027-04-15');
    expect(n[9]).toBe('2027-04-24');
  });
});
