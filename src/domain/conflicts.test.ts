import { computeAlerts } from './conflicts';
import { makeEvent, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

describe('computeAlerts', () => {
  it('détecte deux activités qui se chevauchent', () => {
    const s = makeState({
      events: [
        makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e2', activity_id: 'rando', duration: 'day', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e3', activity_id: 'surf', duration: 'half', start_date: '2027-04-17', start_part: 'matin' }),
      ],
      event_participants: [...participants('e1', ['p1']), ...participants('e2', ['p1']), ...participants('e3', ['p1'])],
    });
    expect(computeAlerts(s).filter(a => a.kind === 'overlap')).toEqual([{ kind: 'overlap', personId: 'p1', eventIds: ['e1', 'e2'] }]);
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
