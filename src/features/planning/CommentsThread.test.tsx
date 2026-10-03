import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentsThread } from './CommentsThread';
import { makeEvent, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const state = makeState({
  events: [makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin' })],
  event_comments: [
    { id: 'c1', trip_id: 'trip', event_id: 'e1', author_id: 'p2', body: 'Je réserve ?', created_at: '2026-10-01T10:00:00Z' },
    { id: 'c2', trip_id: 'trip', event_id: 'e1', author_id: 'p1', body: 'Oui !', created_at: '2026-10-01T11:00:00Z' },
  ],
});

describe('CommentsThread', () => {
  it('affiche les commentaires avec leur auteur', () => {
    renderWithTrip(<CommentsThread eventId="e1" />, { state });
    expect(screen.getByText('Jules')).toBeInTheDocument();
    expect(screen.getByText('Je réserve ?')).toBeInTheDocument();
  });

  it('ne permet de supprimer que ses propres commentaires', async () => {
    const { actions } = renderWithTrip(<CommentsThread eventId="e1" />, { state });
    const buttons = screen.getAllByRole('button', { name: 'Supprimer le commentaire' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);
    expect(actions.deleteComment).toHaveBeenCalledWith('c2');
  });

  it('envoie un commentaire', async () => {
    const { actions } = renderWithTrip(<CommentsThread eventId="e1" />, { state });
    await userEvent.type(screen.getByLabelText('Nouveau commentaire'), 'Super idée');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(actions.addComment).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'e1', author_id: 'p1', body: 'Super idée' }));
  });
});
