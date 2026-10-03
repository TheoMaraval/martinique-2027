import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { firstName, formatDateTime } from '../../lib/format';
import { newId } from '../../lib/ids';

export function CommentsThread({ eventId }: { eventId: string }) {
  const { state, me, actions } = useReadyTrip();
  const [body, setBody] = useState('');
  const comments = state.event_comments
    .filter(c => c.event_id === eventId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const send = () => {
    const text = body.trim();
    if (!text) return;
    void actions.addComment({ id: newId(), trip_id: state.trip.id, event_id: eventId, author_id: me, body: text, created_at: new Date().toISOString() });
    setBody('');
  };
  return (
    <div className="comments">
      {comments.length === 0 && <p className="muted">Pas encore de commentaire.</p>}
      <ul>
        {comments.map(c => (
          <li key={c.id}>
            <div className="comment-head">
              <strong>{firstName(state.people.find(p => p.id === c.author_id)?.name ?? '?')}</strong>
              <span className="muted">{formatDateTime(c.created_at)}</span>
              {c.author_id === me && (
                <button className="icon-btn" aria-label="Supprimer le commentaire" onClick={() => void actions.deleteComment(c.id)}>×</button>
              )}
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
      <div className="row">
        <textarea aria-label="Nouveau commentaire" rows={2} maxLength={2000} placeholder="Écrire un commentaire…" value={body} onChange={e => setBody(e.target.value)} />
        <button type="button" onClick={send} disabled={!body.trim()}>Envoyer</button>
      </div>
    </div>
  );
}
