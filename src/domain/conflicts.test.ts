import { computeAlerts, eventSpan } from './conflicts';
import { makeEvent, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

describe('computeAlerts', () => {
  it('accepte 3 activités le matin, alerte à la 4e (capacité dépassée)', () => {
    const three = makeState({
      events: [
        makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e2', activity_id: 'rando', duration: 'flex', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e3', activity_id: 'surf', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'matin' }),
      ],
      event_participants: [...participants('e1', ['p1']), ...participants('e2', ['p1']), ...participants('e3', ['p1'])],
    });
    expect(computeAlerts(three).filter(a => a.kind === 'overlap')).toEqual([]);
    const four = makeState({
      events: [...three.events, makeEvent({ id: 'e4', activity_id: 'rando', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'matin' })],
      event_participants: [...three.event_participants, ...participants('e4', ['p1', 'p2'])],
    });
    expect(computeAlerts(four).filter(a => a.kind === 'overlap')).toEqual([{ kind: 'overlap', personId: 'p1', eventIds: ['e1', 'e2', 'e3', 'e4'] }]);
  });

  it('midi et soir : 3 activités à la suite sans alerte, alerte à la 4e, étirement compris, sans doublon', () => {
    const s = makeState({
      events: [
        makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin', end_date: '2027-04-16', end_part: 'soir' }),
        makeEvent({ id: 'e2', activity_id: 'rando', duration: 'flex', start_date: '2027-04-16', start_part: 'midi', end_date: '2027-04-16', end_part: 'soir' }),
        makeEvent({ id: 'e3', activity_id: 'surf', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'midi', end_date: '2027-04-16', end_part: 'soir' }),
        makeEvent({ id: 'e4', activity_id: 'rando', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'midi', end_date: '2027-04-16', end_part: 'soir' }),
        makeEvent({ id: 'e5', activity_id: 'surf', duration: 'flex', occurrence: 3, start_date: '2027-04-17', start_part: 'soir' }),
        makeEvent({ id: 'e6', activity_id: 'rando', duration: 'flex', occurrence: 3, start_date: '2027-04-17', start_part: 'soir' }),
        makeEvent({ id: 'e7', activity_id: 'surf', duration: 'flex', occurrence: 4, start_date: '2027-04-17', start_part: 'soir' }),
      ],
      event_participants: [
        ...['e1', 'e2', 'e3'].flatMap(id => participants(id, ['p1', 'p2'])),
        ...['e4', 'e5', 'e6', 'e7'].flatMap(id => participants(id, ['p1'])),
      ],
    });
    expect(computeAlerts(s).filter(a => a.kind === 'overlap')).toEqual([{ kind: 'overlap', personId: 'p1', eventIds: ['e1', 'e2', 'e3', 'e4'] }]);
  });

  it("compte les activités d'une personne dans plusieurs équipes", () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-16', start_part: 'matin', end_date: '2027-04-16', end_part: 'soir' });
    const s = makeState({
      teams: [...makeState().teams, bt], team_members: members('bt', ['p1']),
      events: [
        makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'soir' }),
        makeEvent({ id: 'e2', activity_id: 'surf', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'soir' }),
        makeEvent({ id: 'e3', team_id: 'bt', activity_id: 'rando', duration: 'flex', start_date: '2027-04-16', start_part: 'soir' }),
        makeEvent({ id: 'e4', team_id: 'bt', activity_id: 'rando', duration: 'flex', occurrence: 2, start_date: '2027-04-16', start_part: 'soir' }),
      ],
      event_participants: ['e1', 'e2', 'e3', 'e4'].flatMap(id => participants(id, ['p1'])),
    });
    expect(computeAlerts(s).filter(a => a.kind === 'overlap')).toEqual([{ kind: 'overlap', personId: 'p1', eventIds: ['e1', 'e2', 'e3', 'e4'] }]);
  });

  it('détecte une personne dans deux équipes en même temps', () => {
    const a = makeTeam({ id: 'A', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-18', end_part: 'soir' });
    const b = makeTeam({ id: 'B', start_date: '2027-04-18', start_part: 'matin', end_date: '2027-04-19', end_part: 'soir' });
    const s = makeState({ teams: [...makeState().teams, a, b], team_members: [...members('A', ['p1']), ...members('B', ['p1'])] });
    expect(computeAlerts(s).filter(x => x.kind === 'two-teams')).toEqual([{ kind: 'two-teams', personId: 'p1', teamIds: ['A', 'B'] }]);
  });

  it('signale les nuits sans logement, hors nuits à bord', () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const s = makeState({
      teams: [...makeState().teams, bt],
      team_members: members('bt', ['p1']),
      stays: [makeStay({ id: 's1', night_date: '2027-04-15' }), makeStay({ id: 'opt', night_date: '2027-04-16', chosen: false })],
      events: [makeEvent({ id: 'b', team_id: 'bt', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin' })],
      event_participants: participants('b', ['p1']),
    });
    const nights = computeAlerts(s).filter(a => a.kind === 'no-stay' && a.personId === 'p1').map(a => (a as { night: string }).night);
    expect(nights).toEqual(['2027-04-16', '2027-04-20', '2027-04-21', '2027-04-22', '2027-04-23', '2027-04-24']);
  });
});

describe('eventSpan', () => {
  it("utilise la fin d'étirement de l'activité", () => {
    const e = makeEvent({ id: 'e', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'aprem', end_date: '2027-04-17', end_part: 'matin' });
    expect(eventSpan(makeState(), e).slots).toEqual([6, 7, 8]);
    expect(eventSpan(makeState(), { ...e, end_date: null, end_part: null }).slots).toEqual([6]);
  });
});
