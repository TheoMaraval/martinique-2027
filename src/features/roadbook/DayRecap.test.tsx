import { screen } from '@testing-library/react';
import { DayRecap } from './DayRecap';
import { itinerary } from '../../domain/itinerary';
import { makeEvent, makeMeal, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const state = makeState({
  events: [
    makeEvent({ id: 'e1', activity_id: 'surf', duration: 'flex', start_date: '2027-04-16', start_part: 'matin', end_date: '2027-04-16', end_part: 'aprem' }),
    makeEvent({ id: 'e2', activity_id: 'boat', duration: 'multi:3:2', start_date: '2027-04-18', start_part: 'matin' }),
  ],
  meals: [
    makeMeal({ id: 'm1', date: '2027-04-16', kind: 'dejeuner', place_name: 'Snack Lulu', price: 25, price_mode: 'per_person', links: [{ url: 'https://lulu.mq', label: 'Carte' }] }),
    makeMeal({ id: 'm2', date: '2027-04-16', kind: 'diner', place_name: 'Le Ti Sable' }),
  ],
});

describe('DayRecap', () => {
  it('affiche les repas de l\'équipe avec prix pour info et liens', () => {
    renderWithTrip(<DayRecap days={itinerary(state, null).filter(d => d.date === '2027-04-16')} />, { state });
    expect(screen.getByText('Déjeuner : Snack Lulu')).toBeInTheDocument();
    expect(screen.getByText(/25.*\/pers\. \(pour info\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carte/ })).toHaveAttribute('href', 'https://lulu.mq');
    expect(screen.getByText('Dîner : Le Ti Sable')).toBeInTheDocument();
  });

  it('montre la plage d\'une activité étirée et la formule d\'un séjour, sans « · » vide', () => {
    renderWithTrip(<DayRecap days={itinerary(state, null).filter(d => d.date === '2027-04-16' || d.date === '2027-04-18')} />, { state });
    expect(screen.getByText('Matin → Après-midi')).toBeInTheDocument();
    expect(screen.getByText('Surf').parentElement).toHaveTextContent(/^Surf$/);
    expect(screen.getByText('· 3j/2n')).toBeInTheDocument();
  });
});
