import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceField } from './PriceField';

it('émet le prix et affiche la part par personne', async () => {
  const onChange = vi.fn();
  render(<PriceField price={null} mode="total" onChange={onChange} participants={4} />);
  await userEvent.type(screen.getByLabelText('Montant (€)'), '2400');
  expect(onChange).toHaveBeenLastCalledWith(2400, 'total');
  expect(screen.getByText(/600/)).toBeInTheDocument();
});

it('signale un montant invalide', async () => {
  const onValidity = vi.fn();
  render(<PriceField price={null} mode="total" onChange={vi.fn()} onValidity={onValidity} />);
  await userEvent.type(screen.getByLabelText('Montant (€)'), 'abc');
  expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
  expect(onValidity).toHaveBeenLastCalledWith(false);
});
