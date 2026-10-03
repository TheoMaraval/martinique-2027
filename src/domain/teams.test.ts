import { effectiveTeamIds, rosterAt, teamsOnDay } from './teams';
import { makeState, makeTeam, members } from '../test/fixtures';
import { slotIndex } from './slots';

const boatTeam = makeTeam({ id: 'bt', name: 'Équipe bateau', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
const s = makeState({ teams: [...makeState().teams, boatTeam], team_members: members('bt', ['p1', 'p2']) });
const idx = (date: string, part: 'matin' | 'aprem' | 'soir') => slotIndex(s.trip, date, part);

describe('teams', () => {
  it("répartit l'effectif entre équipe par défaut et équipe parallèle", () => {
    expect(rosterAt(s, 'all', idx('2027-04-18', 'aprem'))).toEqual(['p3', 'p4']);
    expect(rosterAt(s, 'bt', idx('2027-04-18', 'aprem'))).toEqual(['p1', 'p2']);
  });

  it("une équipe hors de sa plage n'a personne", () => {
    expect(rosterAt(s, 'bt', idx('2027-04-16', 'matin'))).toEqual([]);
    expect(rosterAt(s, 'all', idx('2027-04-16', 'matin'))).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('donne les équipes effectives', () => {
    expect(effectiveTeamIds(s, 'p1', idx('2027-04-16', 'matin'))).toEqual(['all']);
    expect(effectiveTeamIds(s, 'p1', idx('2027-04-17', 'matin'))).toEqual(['bt']);
  });

  it('liste les équipes du jour, défaut en premier', () => {
    expect(teamsOnDay(s, '2027-04-16').map(t => t.id)).toEqual(['all']);
    expect(teamsOnDay(s, '2027-04-17').map(t => t.id)).toEqual(['all', 'bt']);
  });
});
