import { addDays, buildSlots, nightDates, slotAt, slotIndex, tripDates } from './slots';
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

  it('construit 33 créneaux avec les vols bloqués', () => {
    const s = buildSlots(TRIP);
    expect(s).toHaveLength(33);
    expect(s[0]).toMatchObject({ date: '2027-04-15', part: 'matin', plannable: false, blockedLabel: 'Vol aller' });
    expect(s[1].plannable).toBe(true);
    expect(s[30]).toMatchObject({ date: '2027-04-25', part: 'matin', plannable: true });
    expect(s[31]).toMatchObject({ plannable: false, blockedLabel: 'Départ' });
    expect(s[32].plannable).toBe(false);
  });

  it('convertit date/moment <-> index', () => {
    expect(slotIndex(TRIP, '2027-04-16', 'soir')).toBe(5);
    expect(slotAt(TRIP, 5)).toEqual({ date: '2027-04-16', part: 'soir' });
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
