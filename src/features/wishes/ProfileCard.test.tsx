import { act, fireEvent, screen } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { renderWithTrip } from '../../test/renderWithTrip';

describe('ProfileCard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('enregistre le budget pendant la saisie, après une pause', async () => {
    const { actions } = renderWithTrip(<ProfileCard />);
    fireEvent.change(screen.getByPlaceholderText('ex. 1500'), { target: { value: '1500' } });
    expect(actions.setBudget).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(actions.setBudget).toHaveBeenCalledWith('p1', 1500);
  });

  it("n'enregistre pas un montant invalide et l'indique à la sortie du champ", async () => {
    const { actions } = renderWithTrip(<ProfileCard />);
    const input = screen.getByPlaceholderText('ex. 1500');
    fireEvent.change(input, { target: { value: 'abc' } });
    await act(async () => { vi.advanceTimersByTime(1000); });
    fireEvent.blur(input);
    expect(actions.setBudget).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
  });

  it('enregistre immédiatement à la sortie du champ', () => {
    const { actions } = renderWithTrip(<ProfileCard />);
    const input = screen.getByPlaceholderText('ex. 1500');
    fireEvent.change(input, { target: { value: '1200' } });
    fireEvent.blur(input);
    expect(actions.setBudget).toHaveBeenCalledWith('p1', 1200);
  });
});
