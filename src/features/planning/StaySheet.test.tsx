import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaySheet } from './StaySheet';
import { makeState, makeStay } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

vi.mock('../../ui/MapPicker', () => ({ MapPicker: () => null }));

const state = makeState({
  stays: [
    makeStay({ id: 'o1', night_date: '2027-04-16', place_name: 'Gîte A', price: 600, links: [{ url: 'https://a.mq', label: 'Annonce A' }] }),
    makeStay({ id: 'o2', night_date: '2027-04-16', place_name: 'Gîte B', price: 800, chosen: false }),
  ],
});

describe('StaySheet', () => {
  it('liste les options avec leurs liens et retient celle choisie', async () => {
    const { actions } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    expect(screen.getByRole('link', { name: /Annonce A/ })).toHaveAttribute('href', 'https://a.mq');
    expect(screen.getByRole('radio', { name: 'Retenir Gîte A' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Retenir Gîte B' }));
    expect(actions.chooseStay).toHaveBeenCalledWith('o2');
  });

  it('crée automatiquement une nouvelle option une fois un lieu saisi, puis la met à jour', async () => {
    const { actions } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    await userEvent.click(screen.getByRole('button', { name: 'Proposer un logement' }));
    expect(screen.queryByRole('button', { name: "Enregistrer l'option" })).toBeNull();
    await userEvent.type(screen.getByLabelText('Nom du lieu'), 'Villa C');
    await waitFor(() => expect(actions.saveStay).toHaveBeenCalledWith(expect.objectContaining({ place_name: 'Villa C', team_id: 'all', night_date: '2027-04-16' })));
    expect(actions.saveStay).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Enregistré'));
    const id = vi.mocked(actions.saveStay).mock.calls[0][0].id;
    await userEvent.type(screen.getByLabelText('Notes'), 'Piscine');
    await waitFor(() => expect(actions.saveStay).toHaveBeenLastCalledWith(expect.objectContaining({ id, place_name: 'Villa C', notes: 'Piscine' })));
  });

  it("ne crée pas d'option vide (notes seules), même en fermant l'éditeur", async () => {
    const { actions } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    await userEvent.click(screen.getByRole('button', { name: 'Proposer un logement' }));
    await userEvent.type(screen.getByLabelText('Notes'), 'À voir');
    await userEvent.click(screen.getByRole('button', { name: 'Terminé' }));
    expect(actions.saveStay).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Proposer un logement' })).toBeInTheDocument();
  });

  it("enregistre la modification d'une option existante en fermant la fiche", async () => {
    const { actions, unmount } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    await userEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[1]);
    await userEvent.type(screen.getByLabelText('Notes'), 'Vue mer');
    unmount();
    expect(actions.saveStay).toHaveBeenCalledWith(expect.objectContaining({ id: 'o2', place_name: 'Gîte B', notes: 'Vue mer' }));
  });

  it("ne ré-enregistre pas l'option en cours de modification quand on la supprime", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { actions, unmount } = renderWithTrip(<StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />, { state });
    await userEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[1]);
    await userEvent.type(screen.getByLabelText('Notes'), 'x');
    await userEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[1]);
    expect(actions.deleteStay).toHaveBeenCalledWith('o2');
    unmount();
    expect(actions.saveStay).not.toHaveBeenCalled();
  });
});

describe('StaySheet — robustesse de l’enregistrement automatique', () => {
  const sheet = <StaySheet teamId="all" night="2027-04-16" onClose={vi.fn()} />;

  it('n’applique que les champs modifiés sur la version actuelle de l’option', async () => {
    const { actions, setState } = renderWithTrip(sheet, { state });
    await userEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[1]);
    await userEvent.type(screen.getByLabelText('Notes'), 'Vue mer');
    setState(makeState({ stays: [state.stays[0], { ...state.stays[1], price: 750 }] }));
    await waitFor(() => expect(actions.saveStay).toHaveBeenCalled());
    expect(actions.saveStay).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o2', price: 750, notes: 'Vue mer' }));
  });

  it("supprimée ailleurs : le dit et n'enregistre plus rien (pas de résurrection)", async () => {
    const { actions, setState, unmount } = renderWithTrip(sheet, { state });
    await userEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[1]);
    await userEvent.type(screen.getByLabelText('Notes'), 'x');
    setState(makeState({ stays: [state.stays[0]] }));
    expect(screen.getByRole('status')).toHaveTextContent("Supprimé par quelqu'un d'autre");
    unmount();
    expect(actions.saveStay).not.toHaveBeenCalled();
  });
});
