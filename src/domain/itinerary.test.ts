import { itinerary, routePoints } from './itinerary';
import { makeEvent, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

const bt = makeTeam({ id: 'bt', color: '#123456', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
const s = makeState({
  teams: [...makeState().teams, bt],
  team_members: members('bt', ['p3']),
  events: [
    makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin', lat: 14.5, lng: -61, place_name: 'Tartane' }),
    makeEvent({ id: 'e2', team_id: 'bt', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', lat: 14.4, lng: -60.9 }),
  ],
  event_participants: [...participants('e1', ['p1', 'p2']), ...participants('e2', ['p3'])],
  stays: [
    makeStay({ id: 'st1', night_date: '2027-04-16', lat: 14.6, lng: -61.1, place_name: 'Gîte Trinité' }),
    makeStay({ id: 'opt', night_date: '2027-04-16', lat: 14.7, lng: -61.2, place_name: 'Villa (option)', chosen: false }),
  ],
});

describe('itinerary', () => {
  it('liste activités et logement par jour', () => {
    const day16 = itinerary(s, null)[1];
    expect(day16.date).toBe('2027-04-16');
    expect(day16.entries).toHaveLength(1);
    expect(day16.entries[0].events.map(e => e.id)).toEqual(['e1']);
    expect(day16.entries[0].stay?.id).toBe('st1');
  });

  it("n'affiche que les équipes ayant quelque chose ce jour-là", () => {
    const day17 = itinerary(s, null)[2];
    expect(day17.entries.map(e => e.team.id)).toEqual(['bt']);
    expect(day17.entries[0].includedBy?.id).toBe('e2');
  });

  it('filtre « Mon parcours »', () => {
    expect(itinerary(s, 'p1')[1].entries[0].events.map(e => e.id)).toEqual(['e1']);
    const p4 = itinerary(s, 'p4')[1].entries[0];
    expect(p4.events).toEqual([]);
    expect(p4.stay?.id).toBe('st1');
  });

  it('produit les points de carte chronologiques sans doublon', () => {
    const pts = routePoints(s, null);
    expect(pts.map(p => p.id)).toEqual(['e1', 'st1', 'e2']);
    expect(pts[0]).toMatchObject({ label: 'Tartane', color: '#0e9aa7' });
    expect(pts[2]).toMatchObject({ label: 'Bateau multi-jours', color: '#123456' });
  });
});
