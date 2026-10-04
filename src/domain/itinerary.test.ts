import { itinerary, routePoints } from './itinerary';
import { makeEvent, makeMeal, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

const bt = makeTeam({ id: 'bt', color: '#123456', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
const s = makeState({
  teams: [...makeState().teams, bt],
  team_members: members('bt', ['p3']),
  events: [
    makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin', lat: 14.5, lng: -61, place_name: 'Tartane' }),
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

describe('itinéraire et repas', () => {
  const withMeals = makeState({
    ...s,
    meals: [
      makeMeal({ id: 'd16', date: '2027-04-16', kind: 'diner', place_name: 'Le Petitbonum', lat: 14.8, lng: -61.2 }),
      makeMeal({ id: 'l16', date: '2027-04-16', kind: 'dejeuner', place_name: 'Snack Tartane', lat: 14.75, lng: -60.9 }),
      makeMeal({ id: 'l18', team_id: 'bt', date: '2027-04-18', kind: 'dejeuner', place_name: 'Pique-nique' }),
      makeMeal({ id: 'l19', date: '2027-04-19', kind: 'dejeuner', place_name: 'Resto' }),
    ],
  });

  it("rattache les repas à l'équipe et au jour, déjeuner puis dîner", () => {
    const day16 = itinerary(withMeals, null)[1].entries[0];
    expect(day16.meals.map(m => m.id)).toEqual(['l16', 'd16']);
    const day18 = itinerary(withMeals, null)[3];
    expect(day18.entries.find(e => e.team.id === 'bt')?.meals.map(m => m.id)).toEqual(['l18']);
  });

  it('un jour avec seulement un repas apparaît', () => {
    const day19 = itinerary(withMeals, null)[4];
    expect(day19.entries.find(e => e.team.id === 'all')?.meals.map(m => m.id)).toEqual(['l19']);
  });

  it("« Mon parcours » ne montre que les repas de l'équipe de la personne", () => {
    const p3 = itinerary(withMeals, 'p3')[3].entries;
    expect(p3.flatMap(e => e.meals.map(m => m.id))).toEqual(['l18']);
    const p1 = itinerary(withMeals, 'p1')[3].entries;
    expect(p1.flatMap(e => e.meals.map(m => m.id))).toEqual([]);
  });

  it('place les repas géolocalisés sur la carte', () => {
    const pts = routePoints(withMeals, null);
    expect(pts.map(p => p.id)).toEqual(['e1', 'l16', 'd16', 'st1', 'e2']);
    expect(pts.find(p => p.id === 'l16')).toMatchObject({ label: 'Déjeuner : Snack Tartane', color: '#0e9aa7' });
    expect(pts.find(p => p.id === 'd16')).toMatchObject({ label: 'Dîner : Le Petitbonum' });
  });
});
