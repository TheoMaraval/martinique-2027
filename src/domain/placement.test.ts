import {
  buildPlacedEvent, canDrop, canResize, eventsOutsideTeam, movedEvent, nextOccurrence, resizedEvent, startOptions,
} from './placement';
import { makeEvent, makeState, makeTeam, members } from '../test/fixtures';
import type { UnplacedItem } from './unplaced';
import type { TripEvent } from './types';

const s = makeState();
const item = (activityId: string, duration: string, personIds: string[]): UnplacedItem => ({
  key: 'k', activity: s.activities.find(a => a.id === activityId)!, duration, occurrence: 1, personIds,
});
const flex = (id: string, date: string, part: TripEvent['start_part'], extra: Partial<TripEvent> = {}) =>
  makeEvent({ id, activity_id: 'surf', duration: 'flex', start_date: date, start_part: part, ...extra });
const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });

describe('buildPlacedEvent', () => {
  it("préremplit avec les membres de l'équipe qui l'ont suggérée", () => {
    const { event, participantIds } = buildPlacedEvent(s, item('surf', 'flex', ['p1', 'p2']), 'all', 4, 'e1');
    expect(event).toMatchObject({ id: 'e1', team_id: 'all', activity_id: 'surf', start_date: '2027-04-16', start_part: 'matin', occurrence: 1 });
    expect(participantIds).toEqual(['p1', 'p2']);
  });

  it("prend toute l'équipe si personne de l'équipe ne l'a suggérée", () => {
    const { participantIds } = buildPlacedEvent(s, item('surf', 'flex', []), 'all', 4, 'e1');
    expect(participantIds).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('une activité simple occupe 1 créneau (fin = début), sans normalisation', () => {
    const { event } = buildPlacedEvent(s, item('surf', 'flex', ['p1']), 'all', 7, 'e1');
    expect(event).toMatchObject({ start_date: '2027-04-16', start_part: 'soir', end_date: '2027-04-16', end_part: 'soir' });
  });

  it('un multi-jours n’a pas de fin explicite', () => {
    const { event } = buildPlacedEvent(s, item('boat', 'multi:4:3', ['p1']), 'all', 8, 'e1');
    expect(event).toMatchObject({ start_date: '2027-04-17', start_part: 'matin', end_date: null, end_part: null });
  });
});

describe('canDrop', () => {
  it('refuse les créneaux bloqués ou hors équipe', () => {
    const st = makeState({ teams: [...s.teams, bt], team_members: members('bt', ['p1']) });
    expect(canDrop(st, 'all', 0, 'flex')).toBe(false);
    expect(canDrop(st, 'all', 1, 'flex')).toBe(false);
    expect(canDrop(st, 'all', 2, 'flex')).toBe(true);
    expect(canDrop(st, 'bt', 4, 'flex')).toBe(false);
    expect(canDrop(st, 'bt', 8, 'flex')).toBe(true);
    expect(canDrop(st, 'all', 42, 'flex')).toBe(false);
  });

  it('accepte une activité simple sur tout créneau planifiable, Midi et Soir compris', () => {
    expect(canDrop(s, 'all', 5, 'flex')).toBe(true);
    expect(canDrop(s, 'all', 7, 'flex')).toBe(true);
    expect(canDrop(s, 'all', 7, 'half')).toBe(true);
  });

  it('respecte la capacité : 2 le matin, 1 le midi', () => {
    const one = makeState({ events: [flex('a', '2027-04-16', 'matin'), flex('m', '2027-04-16', 'midi')] });
    expect(canDrop(one, 'all', 4, 'flex')).toBe(true);
    expect(canDrop(one, 'all', 5, 'flex')).toBe(false);
    expect(canDrop(one, 'all', 5, 'flex', 'm')).toBe(true);
    const two = makeState({ events: [flex('a', '2027-04-16', 'matin'), flex('b', '2027-04-16', 'matin')] });
    expect(canDrop(two, 'all', 4, 'flex')).toBe(false);
    expect(canDrop(two, 'all', 4, 'flex', 'b')).toBe(true);
  });

  it('la capacité tient compte des activités étirées et se compte par équipe', () => {
    const st = makeState({
      teams: [...s.teams, bt], team_members: members('bt', ['p1']),
      events: [flex('a', '2027-04-17', 'matin', { end_date: '2027-04-17', end_part: 'soir' })],
    });
    expect(canDrop(st, 'all', 9, 'flex')).toBe(false); // midi du 17 occupé par l'étirement
    expect(canDrop(st, 'all', 10, 'flex')).toBe(true); // après-midi : 1 sur 2
    expect(canDrop(st, 'bt', 9, 'flex')).toBe(true); // autre équipe
  });

  it("refuse un multi-jours qui dépasse la période de l'équipe ou un créneau plein", () => {
    const st = makeState({ teams: [...s.teams, bt], team_members: members('bt', ['p1']) });
    expect(canDrop(st, 'bt', 8, 'multi:4:3')).toBe(true);
    expect(canDrop(st, 'bt', 12, 'multi:4:3')).toBe(false);
    const busy = makeState({ events: [flex('m', '2027-04-18', 'midi')] });
    expect(canDrop(busy, 'all', 8, 'multi:2:1')).toBe(false);
    expect(canDrop(busy, 'all', 8, 'multi:2:1', 'm')).toBe(true);
  });
});

describe('canResize / resizedEvent', () => {
  const ev = flex('e1', '2027-04-16', 'matin');
  it('étire vers les créneaux suivants', () => {
    const st = makeState({ events: [ev] });
    expect(canResize(st, 'e1', 6)).toBe(true);
    expect(resizedEvent(st, 'e1', 6)).toMatchObject({ end_date: '2027-04-16', end_part: 'aprem' });
    expect(canResize(st, 'e1', 4)).toBe(true);
    expect(resizedEvent(st, 'e1', 4)).toMatchObject({ end_date: '2027-04-16', end_part: 'matin' });
  });

  it('refuse une fin avant le début, hors équipe ou un créneau plein', () => {
    const team = makeTeam({ id: 'bt', start_date: '2027-04-16', start_part: 'matin', end_date: '2027-04-16', end_part: 'aprem' });
    const st = makeState({
      teams: [...s.teams, team], team_members: members('bt', ['p1']),
      events: [ev, flex('m', '2027-04-17', 'midi'), { ...flex('t', '2027-04-16', 'matin'), team_id: 'bt' }],
    });
    expect(canResize(st, 'e1', 3)).toBe(false);
    expect(canResize(st, 'e1', 9)).toBe(false); // midi du 17 plein
    expect(canResize(st, 'e1', 8)).toBe(true);
    expect(canResize(st, 't', 6)).toBe(true);
    expect(canResize(st, 't', 7)).toBe(false); // hors période de l'équipe
    expect(resizedEvent(st, 'e1', 9)).toBeNull();
  });

  it('refuse d’étirer un multi-jours ou une activité inconnue', () => {
    const st = makeState({ events: [makeEvent({ id: 'b', activity_id: 'boat', duration: 'multi:2:1', start_date: '2027-04-17', start_part: 'matin' })] });
    expect(canResize(st, 'b', 20)).toBe(false);
    expect(canResize(st, 'zz', 20)).toBe(false);
  });
});

describe('movedEvent', () => {
  it("déplace une activité et recalcule les participants quand l'équipe change", () => {
    const ev = flex('e1', '2027-04-16', 'matin');
    const st = makeState({
      teams: [...s.teams, bt], team_members: members('bt', ['p1', 'p3']), events: [ev],
      event_participants: [{ trip_id: 'trip', event_id: 'e1', person_id: 'p2' }, { trip_id: 'trip', event_id: 'e1', person_id: 'p3' }],
    });
    const same = movedEvent(st, 'e1', 'all', 6)!;
    expect(same.event).toMatchObject({ team_id: 'all', start_date: '2027-04-16', start_part: 'aprem', end_date: '2027-04-16', end_part: 'aprem' });
    expect(same.participantIds).toBeUndefined();
    const moved = movedEvent(st, 'e1', 'bt', 8)!;
    expect(moved.event.team_id).toBe('bt');
    expect(moved.participantIds).toEqual(['p3']);
    expect(movedEvent(makeState({ events: [ev], event_participants: [{ trip_id: 'trip', event_id: 'e1', person_id: 'p2' }], teams: [...s.teams, bt], team_members: members('bt', ['p1']) }), 'e1', 'bt', 8)!.participantIds).toEqual(['p1']);
    expect(movedEvent(st, 'e1', 'bt', 4)).toBeNull();
  });

  it('conserve la longueur d’une activité étirée si possible', () => {
    const ev = flex('e1', '2027-04-16', 'matin', { end_date: '2027-04-16', end_part: 'aprem' });
    const st = makeState({ events: [ev] });
    expect(movedEvent(st, 'e1', 'all', 10)!.event).toMatchObject({
      start_date: '2027-04-17', start_part: 'aprem', end_date: '2027-04-18', end_part: 'matin',
    });
    // Glisser sur son propre créneau : on s'ignore soi-même pour la capacité.
    expect(movedEvent(st, 'e1', 'all', 5)!.event).toMatchObject({ start_part: 'midi', end_date: '2027-04-16', end_part: 'soir' });
  });

  it('ramène à 1 créneau quand la longueur ne tient pas', () => {
    const ev = flex('e1', '2027-04-16', 'matin', { end_date: '2027-04-16', end_part: 'aprem' });
    const st = makeState({ events: [ev, flex('m', '2027-04-17', 'midi')] });
    expect(movedEvent(st, 'e1', 'all', 8)!.event).toMatchObject({
      start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-17', end_part: 'matin',
    });
    // Fin du voyage : pas assez de créneaux planifiables.
    expect(movedEvent(st, 'e1', 'all', 41)!.event).toMatchObject({ start_part: 'midi', end_date: '2027-04-25', end_part: 'midi' });
  });

  it('refuse un créneau plein', () => {
    const st = makeState({ events: [flex('e1', '2027-04-16', 'matin'), flex('m', '2027-04-17', 'midi')] });
    expect(movedEvent(st, 'e1', 'all', 9)).toBeNull();
  });
});

describe('autres', () => {
  it('trouve la prochaine occurrence libre (clés legacy assimilées à flex)', () => {
    const events = [
      makeEvent({ id: 'e1', activity_id: 'rando', duration: 'flex', occurrence: 1, start_date: '2027-04-16', start_part: 'matin' }),
      makeEvent({ id: 'e3', activity_id: 'rando', duration: 'half', occurrence: 3, start_date: '2027-04-17', start_part: 'matin' }),
    ];
    expect(nextOccurrence(makeState({ events }), 'rando', 'flex')).toBe(2);
    expect(nextOccurrence(makeState({ events: [...events, { ...events[0], id: 'e2', occurrence: 2 }] }), 'rando', 'day')).toBe(4);
  });

  it("liste les activités qui sortent de la période d'une équipe (fin d'étirement comprise)", () => {
    const inside = { ...flex('in', '2027-04-18', 'matin'), team_id: 'bt' };
    const out = { ...flex('out', '2027-04-21', 'matin'), team_id: 'bt' };
    const stretched = { ...flex('str', '2027-04-20', 'aprem', { end_date: '2027-04-21', end_part: 'matin' }), team_id: 'bt' };
    const other = flex('other', '2027-04-21', 'matin');
    const st = makeState({ teams: [...s.teams, bt], events: [inside, out, stretched, other] });
    expect(eventsOutsideTeam(st, bt).map(e => e.id)).toEqual(['out', 'str']);
    expect(eventsOutsideTeam(st, { ...bt, end_date: '2027-04-17', end_part: 'soir' }).map(e => e.id)).toEqual(['in', 'out', 'str']);
  });

  it('propose comme départs tous les créneaux où l’activité peut être déposée', () => {
    const opts = startOptions(s, 'all', 'flex');
    expect(opts).toHaveLength(40);
    expect(opts.some(x => x.part === 'midi')).toBe(true);
    const busy = startOptions(makeState({ events: [flex('m', '2027-04-16', 'midi')] }), 'all', 'flex');
    expect(busy.map(x => x.index)).not.toContain(5);
  });
});
