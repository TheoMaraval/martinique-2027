import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentityPicker } from './IdentityPicker';
import { makeState } from '../test/fixtures';

it('liste les voyageurs et renvoie le choix', async () => {
  const onPick = vi.fn();
  render(<IdentityPicker people={makeState().people} onPick={onPick} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
  await userEvent.click(screen.getByRole('button', { name: 'Jules' }));
  expect(onPick).toHaveBeenCalledWith('p2');
});
