import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, CircleHelp, Link2Off, Palmtree } from 'lucide-react';
import { TripProvider } from './data/TripProvider';
import { useTrip } from './data/TripContext';
import { IdentityPicker } from './identity/IdentityPicker';
import { BottomNav, type Tab } from './ui/BottomNav';
import { OfflineBanner, Toasts } from './ui/Feedback';
import { Avatar } from './ui/Avatar';
import { WishesTab } from './features/wishes/WishesTab';
import { PlanningTab } from './features/planning/PlanningTab';
import { RoadbookTab } from './features/roadbook/RoadbookTab';
import type { Trip } from './domain/types';
import { Onboarding } from './onboarding/Onboarding';
import { hasSeenTuto, markTutoSeen } from './onboarding/storage';

export function parseTripCode(hash: string): string | null {
  const m = /^#\/t\/([A-Za-z0-9]+)/.exec(hash);
  return m ? m[1] : null;
}

const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
const dayMonthFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const DAY_MS = 86_400_000;

/** « 15 → 25 avril 2027 · 10 voyageurs · J-194 » (J-N calculé jusqu'au départ). */
export function tripSubtitle(trip: Pick<Trip, 'start_date' | 'end_date'>, travellers: number, now = new Date()): string {
  const start = new Date(`${trip.start_date}T00:00:00Z`);
  const end = new Date(`${trip.end_date}T00:00:00Z`);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const range = sameMonth
    ? `${start.getUTCDate()} → ${end.getUTCDate()} ${monthFmt.format(end)} ${end.getUTCFullYear()}`
    : `${dayMonthFmt.format(start)} → ${dayMonthFmt.format(end)} ${end.getUTCFullYear()}`;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((start.getTime() - today) / DAY_MS);
  const countdown = days > 0 ? `J-${days}` : "C'est parti !";
  // Le compte à rebours d'abord : sur mobile la fin du sous-titre est tronquée.
  return `${countdown} · ${range} · ${travellers} voyageur${travellers > 1 ? 's' : ''}`;
}

function InvalidLink() {
  return (
    <main className="center-page">
      <span className="center-icon"><Link2Off size={28} /></span>
      <h1>Lien invalide</h1>
      <p className="muted">Demande le lien du voyage au groupe.</p>
    </main>
  );
}

export function Shell({ code }: { code: string }) {
  const { status, state, me, setMe, online, retry } = useTrip();
  const [tab, setTab] = useState<Tab>('envies');
  // Tutoriel : une fois par appareil (localStorage), ou une fois par session si le stockage est indisponible.
  const [tuto, setTuto] = useState(() => !hasSeenTuto(code));
  const closeTuto = useCallback(() => { markTutoSeen(code); setTuto(false); }, [code]);
  if (status === 'invalid') return <InvalidLink />;
  if (!state) {
    return (
      <main className="center-page">
        {status === 'error' ? (
          <>
            <p>Impossible de charger le voyage. Vérifie ta connexion.</p>
            <button className="primary" onClick={retry}>Réessayer</button>
          </>
        ) : (
          <>
            <span className="spinner" aria-hidden="true" />
            <p className="muted">Chargement…</p>
          </>
        )}
      </main>
    );
  }
  const person = state.people.find(p => p.id === me);
  if (!person) return <IdentityPicker people={state.people} onPick={setMe} />;
  const first = person.name.split(' ')[0];
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1><Palmtree size={20} /> {state.trip.name}</h1>
          <p className="app-sub">{tripSubtitle(state.trip, state.people.length)}</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn header-help" aria-label="Revoir le tuto" onClick={() => setTuto(true)}><CircleHelp size={22} /></button>
          <button className="identity-btn" onClick={() => setMe(null)}>
            <Avatar name={person.name} size="sm" className="avatar-glass" />
            <span className="identity-name">{first}</span>
            <span className="sr-only"> · changer</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </header>
      {!online && <OfflineBanner />}
      <main className="app-main">
        {tab === 'envies' && <WishesTab />}
        {tab === 'planning' && <PlanningTab />}
        {tab === 'roadbook' && <RoadbookTab />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
      <Toasts />
      {tuto && <Onboarding onClose={closeTuto} />}
    </div>
  );
}

export function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const code = parseTripCode(hash);
  if (!code) return <InvalidLink />;
  return (
    <TripProvider key={code} code={code}>
      <Shell code={code} />
    </TripProvider>
  );
}
