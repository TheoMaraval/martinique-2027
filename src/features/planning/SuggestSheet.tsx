import { Sheet } from '../../ui/Sheet';
import { AddActivityForm } from '../wishes/AddActivityForm';

/** Suggérer depuis le planning : même formulaire que l'onglet Envies ; l'activité compte comme envie du créateur. */
export function SuggestSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Suggérer une activité" onClose={onClose}>
      <AddActivityForm onDone={onClose} />
    </Sheet>
  );
}
