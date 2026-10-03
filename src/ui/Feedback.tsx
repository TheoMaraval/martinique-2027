import { Info, WifiOff } from 'lucide-react';
import { useTrip } from '../data/TripContext';

export function OfflineBanner() {
  return <div className="offline" role="status"><WifiOff size={16} /> Hors ligne — reconnexion…</div>;
}

export function Toasts() {
  const { toasts, dismissToast } = useTrip();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>
          <Info size={18} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
