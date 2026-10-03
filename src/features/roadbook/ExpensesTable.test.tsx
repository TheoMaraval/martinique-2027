import { screen, within } from '@testing-library/react';
import { ExpensesTable } from './ExpensesTable';
import { makeEvent, makeState, makeStay, participants } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';
import { formatEuros as fmt } from '../../lib/format';

// getByText normalise les espaces insécables du format fr-FR : on normalise aussi l'attendu.
const formatEuros = (n: number) => fmt(n).replace(/\s+/g, ' ');

it('résume les dépenses par personne et rappelle le périmètre', () => {
  const state = makeState({
    events: [makeEvent({ id: 'b', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', price: 2400 })],
    event_participants: participants('b', ['p1', 'p2', 'p3', 'p4']),
    stays: [makeStay({ id: 'st', night_date: '2027-04-15', price: 1000 })],
  });
  renderWithTrip(<ExpensesTable highlight="p1" />, { state });
  expect(screen.getByText(/Hors restaurants et sorties gratuites/)).toBeInTheDocument();
  const row = screen.getByRole('row', { name: /Théo/ });
  expect(row).toHaveClass('me');
  expect(within(row).getByText(formatEuros(850))).toBeInTheDocument();
  expect(within(row).getByText(`+${formatEuros(150)}`)).toHaveClass('ok');
  const foot = screen.getByRole('row', { name: /Total groupe/ });
  expect(within(foot).getByText(formatEuros(3400))).toBeInTheDocument();
});
