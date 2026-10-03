import { buildPlacedEvent, canDrop, nextOccurrence } from './placement';
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
    expect(canDrop(st, 'all', 0)).toBe(false);
    expect(canDrop(st, 'bt', 3)).toBe(false);
    expect(canDrop(st, 'bt', 6)).toBe(true);
  });

  it('trouve la prochaine occurrence libre', () => {
    const events = [1, 3].map(o => makeEvent({ id: `e${o}`, activity_id: 'rando', duration: 'half', occurrence: o, start_date: '2027-04-16', start_part: 'matin' }));
    expect(nextOccurrence(makeState({ events }), 'rando', 'half')).toBe(2);
  });
});
