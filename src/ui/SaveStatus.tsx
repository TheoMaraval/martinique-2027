import { Check } from 'lucide-react';
import type { AutosaveStatus } from '../lib/useAutosave';

/** Indicateur d'enregistrement automatique : « Enregistrement… » puis « Enregistré ». */
export function SaveStatus({ status }: { status: AutosaveStatus }) {
  const busy = status === 'pending' || status === 'saving';
  return (
    <span className={`save-status ${status}`} role="status" aria-live="polite">
      {busy && 'Enregistrement…'}
      {status === 'saved' && <><Check size={16} aria-hidden="true" /> Enregistré</>}
    </span>
  );
}
