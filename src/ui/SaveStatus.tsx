import { Check } from 'lucide-react';
import type { AutosaveStatus } from '../lib/useAutosave';

const TEXT: Partial<Record<AutosaveStatus, string>> = {
  pending: 'Enregistrement…',
  saving: 'Enregistrement…',
  retrying: 'Non enregistré — nouvel essai…',
  error: 'Non enregistré',
};

/**
 * Indicateur d'enregistrement automatique : « Enregistrement… » puis « Enregistré », ou l'échec.
 * `deleted` : l'élément a été supprimé ailleurs, plus rien n'est enregistré.
 */
export function SaveStatus({ status, deleted = false }: { status: AutosaveStatus; deleted?: boolean }) {
  const failed = deleted || status === 'retrying' || status === 'error';
  return (
    <span className={`save-status ${failed ? 'failed' : status}`} role="status" aria-live="polite">
      {deleted ? "Supprimé par quelqu'un d'autre" : status === 'saved' ? <><Check size={16} aria-hidden="true" /> Enregistré</> : TEXT[status]}
    </span>
  );
}
