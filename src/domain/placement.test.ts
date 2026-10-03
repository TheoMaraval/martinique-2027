import { buildPlacedEvent, canDrop, eventsOutsideTeam, movedEvent, nextOccurrence, startOptions } from './placement';
import { makeEvent, makeState, makeTeam, members } from '../test/fixtures';
import type { UnplacedItem } from './unplaced';

const s = makeState();
const item = (activityId: string, duration: string, personIds: string[]): UnplacedItem => ({
  key: 'k', activity: s.activities.find(a => a.id === activityId)!, duration, occurrence: 1, personIds,
});

describe('placement', () => {
  it("préremplit avec les membres de l'équipe qui l'ont suggérée", () => {
    const { event, participantIds } = buildPlacedEvent(s, item('surf', 'half', ['p1', 'p2']), 'all', 3, 'e1');
    expect(event).toMatchObject({ id: 'e1', team_id: 'all', activity_id: 'surf', start_date: '2027-04-16', start_part: 'matin', occurrence: 1 });
    expect(participantIds).toEqual(['p1', 'p2']);
  });

  it("prend toute l'équipe si personne de l'équipe ne l'a suggérée", () => {
    const { participantIds } = buildPlacedEvent(s, item('surf', 'half', []), 'all', 3, 'e1');
    expect(participantIds).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('normalise une journée déposée le soir', () => {
    const { event } = buildPlacedEvent(s, item('surf', 'day', ['p1']), 'all', 5, 'e1');
    expect(event.start_part).toBe('matin');
  });

  it('refuse les créneaux bloqués ou hors équipe', () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const st = makeState({ teams: [...s.teams, bt], team_members: members('bt', ['p1']) });
    expect(canDrop(st, 'all', 0, 'half')).toBe(false);
    expect(canDrop(st, 'bt', 3, 'half')).toBe(false);
    expect(canDrop(st, 'bt', 6, 'half')).toBe(true);
  });

  it('valide selon la durée', () => {
    expect(canDrop(s, 'all', 30, 'evening')).toBe(false);
    expect(canDrop(s, 'all', 5, 'half')).toBe(false);
    expect(canDrop(s, 'all', 4, 'half')).toBe(true);
    const late = makeTeam({ id: 'late', start_date: '2027-04-17', start_part: 'aprem', end_date: '2027-04-20', end_part: 'soir' });
    const st = makeState({ teams: [...s.teams, late], team_members: members('late', ['p1']) });
    expect(canDrop(st, 'late', 7, 'day')).toBe(false);
  });

  it('trouve la prochaine occurrence libre', () => {
    const events = [1, 3].map(o => makeEvent({ id: `e${o}`, activity_id: 'rando', duration: 'half', occurrence: o, start_date: '2027-04-16', start_part: 'matin' }));
    expect(nextOccurrence(makeState({ events }), 'rando', 'half')).toBe(2);
  });

  it("refuse une activité multi-jours qui dépasse la période de l'équipe", () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const st = makeState({ teams: [...s.teams, bt], team_members: members('bt', ['p1']) });
    expect(canDrop(st, 'bt', 6, 'multi:4:3')).toBe(true);
    expect(canDrop(st, 'bt', 9, 'multi:4:3')).toBe(false);
  });

  it("liste les activités qui sortent de la période d'une équipe", () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const inside = makeEvent({ id: 'in', team_id: 'bt', activity_id: 'surf', duration: 'half', start_date: '2027-04-18', start_part: 'matin' });
    const out = makeEvent({ id: 'out', team_id: 'bt', activity_id: 'surf', duration: 'half', start_date: '2027-04-21', start_part: 'matin' });
    const other = makeEvent({ id: 'other', team_id: 'all', activity_id: 'surf', duration: 'half', start_date: '2027-04-21', start_part: 'matin' });
    const st = makeState({ teams: [...s.teams, bt], events: [inside, out, other] });
    expect(eventsOutsideTeam(st, bt).map(e => e.id)).toEqual(['out']);
    const shrunk = { ...bt, end_date: '2027-04-18' };
    expect(eventsOutsideTeam(st, shrunk).map(e => e.id)).toEqual(['out']);
    expect(eventsOutsideTeam(st, { ...bt, end_date: '2027-04-17', end_part: 'soir' }).map(e => e.id)).toEqual(['in', 'out']);
  });

  it('ne propose qu’un créneau de départ par jour pour une journée ou une soirée', () => {
    const day = startOptions(s, 'all', 'day');
    const dates = day.map(x => x.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(day.every(x => x.part === 'matin' || x.part === 'aprem')).toBe(true);
    expect(startOptions(s, 'all', 'evening').every(x => x.part === 'soir')).toBe(true);
    expect(startOptions(s, 'all', 'half').length).toBeGreaterThan(day.length);
  });

  it("déplace une activité et recalcule les participants quand l'équipe change", () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const ev = makeEvent({ id: 'e1', team_id: 'all', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin' });
    const st = makeState({
      teams: [...s.teams, bt], team_members: members('bt', ['p1', 'p3']), events: [ev],
      event_participants: [{ trip_id: 'trip', event_id: 'e1', person_id: 'p2' }, { trip_id: 'trip', event_id: 'e1', person_id: 'p3' }],
    });
    const same = movedEvent(st, 'e1', 'all', 4)!;
    expect(same.event).toMatchObject({ team_id: 'all', start_date: '2027-04-16', start_part: 'aprem' });
    expect(same.participantIds).toBeUndefined();
    const moved = movedEvent(st, 'e1', 'bt', 6)!;
    expect(moved.event.team_id).toBe('bt');
    expect(moved.participantIds).toEqual(['p3']);
    expect(movedEvent(makeState({ events: [ev], event_participants: [{ trip_id: 'trip', event_id: 'e1', person_id: 'p2' }], teams: [...s.teams, bt], team_members: members('bt', ['p1']) }), 'e1', 'bt', 6)!.participantIds).toEqual(['p1']);
    expect(movedEvent(st, 'e1', 'bt', 3)).toBeNull();
  });
});
