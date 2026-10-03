import { useTrip } from '../data/TripContext';

export function OfflineBanner() {
  return <div className="offline" role="status">Hors ligne — reconnexion…</div>;
}

export function Toasts() {
  const { toasts, dismissToast } = useTrip();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>{t.text}</div>
      ))}
    </div>
  );
}
