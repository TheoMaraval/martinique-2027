import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from './Onboarding';
import { Shell } from '../App';
import { renderWithTrip } from '../test/renderWithTrip';

describe('Onboarding', () => {
  it('avance, recule et se termine sur « C\'est parti »', async () => {
    const onClose = vi.fn();
    render(<Onboarding onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Tutoriel' })).toBeInTheDocument();
    expect(screen.getByText('Théo le J vous souhaite le bonjour !')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Choisis tes envies')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('Théo le J vous souhaite le bonjour !')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: "Aller à l'étape 6" }));
    expect(screen.getByText('Vive le mafé sauce graine !')).toBeInTheDocument();
    expect(screen.getByText('Bon voyage à tous !')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: "C'est parti" }));
    expect(onClose).toHaveBeenCalled();
  });

  it('se navigue au clavier et se ferme avec Échap', () => {
    const onClose = vi.fn();
    render(<Onboarding onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Construis le planning')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Choisis tes envies')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Tutoriel dans la coquille', () => {
  afterEach(() => localStorage.clear());

  it('s\'affiche une fois la personne connue, puis « Passer » le ferme et le mémorise', async () => {
    renderWithTrip(<Shell code="abc" />);
    expect(screen.getByText('Théo le J vous souhaite le bonjour !')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Choisis tes envies')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.queryByRole('dialog', { name: 'Tutoriel' })).toBeNull();
    expect(localStorage.getItem('martinique:tuto-vu:abc')).not.toBeNull();
  });

  it('ne s\'affiche pas si déjà vu, mais peut être revu', async () => {
    localStorage.setItem('martinique:tuto-vu:abc', '1');
    renderWithTrip(<Shell code="abc" />);
    expect(screen.queryByRole('dialog', { name: 'Tutoriel' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Revoir le tuto' }));
    expect(screen.getByText('Théo le J vous souhaite le bonjour !')).toBeInTheDocument();
  });

  it('ne s\'affiche pas avant le choix du prénom', () => {
    renderWithTrip(<Shell code="abc" />, { me: '' });
    expect(screen.getByText('Qui es-tu ?')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Tutoriel' })).toBeNull();
  });
});
