import { screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { UnplacedPanel } from './UnplacedPanel';
import { makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';
import type { Wish } from '../../domain/types';

const w = (id: string, person_id: string, activity_id: string, duration: string, quantity = 1): Wish =>
  ({ id, trip_id: 'trip', person_id, activity_id, duration, quantity });

it('met en avant les activités non placées les plus suggérées', () => {
  const state = makeState({
    wishes: [w('1', 'p1', 'surf', 'half'), w('2', 'p2', 'surf', 'half'), w('3', 'p3', 'surf', 'half'), w('4', 'p1', 'rando', 'half', 2)],
  });
  renderWithTrip(<DndContext><UnplacedPanel /></DndContext>, { state });
  expect(screen.getByText('À placer (3)', { exact: false })).toBeInTheDocument();
  const hot = screen.getByText('Suggérée par 3').closest('li')!;
  expect(hot).toHaveClass('hot');
  expect(hot).toHaveTextContent('Théo, Jules, Inès');
  expect(screen.getByText('Randonnée n°2')).toBeInTheDocument();
  expect(screen.getAllByText('Suggérée par 1')[0].closest('li')).not.toHaveClass('hot');
});

it('indique quand tout est placé', () => {
  renderWithTrip(<DndContext><UnplacedPanel /></DndContext>);
  expect(screen.getByText('Toutes les envies sont placées.')).toBeInTheDocument();
});
