import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinksEditor } from './Links';

describe('LinksEditor', () => {
  it('refuse une URL invalide', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('URL du lien'), 'pas-un-lien');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Lien invalide');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ajoute un lien avec libellé', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('URL du lien'), 'https://catamaran.mq');
    await userEvent.type(screen.getByLabelText('Libellé du lien'), 'Loueur');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onChange).toHaveBeenCalledWith([{ url: 'https://catamaran.mq', label: 'Loueur' }]);
  });

  it('retire un lien', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[{ url: 'https://a.fr', label: 'A' }]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retirer A' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
