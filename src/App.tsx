import { useEffect, useState } from 'react';
import { TripProvider } from './data/TripProvider';
import { useTrip } from './data/TripContext';
import { IdentityPicker } from './identity/IdentityPicker';
import { BottomNav, type Tab } from './ui/BottomNav';
import { OfflineBanner, Toasts } from './ui/Feedback';
import { WishesTab } from './features/wishes/WishesTab';
import { PlanningTab } from './features/planning/PlanningTab';
import { RoadbookTab } from './features/roadbook/RoadbookTab';

export function parseTripCode(hash: string): string | null {
  const m = /^#\/t\/([A-Za-z0-9]+)/.exec(hash);
  return m ? m[1] : null;
}

function InvalidLink() {
  return (
    <main className="center-page">
      <h1>Lien invalide</h1>
      <p>Demande le lien du voyage au groupe.</p>
    </main>
  );
}

function Shell() {
  const { status, state, me, setMe, online, retry } = useTrip();
  const [tab, setTab] = useState<Tab>('envies');
  if (status === 'invalid') return <InvalidLink />;
  if (!state) {
    return (
      <main className="center-page">
        <p>{status === 'error' ? 'Impossible de charger le voyage. Vérifie ta connexion.' : 'Chargement…'}</p>
        {status === 'error' && <button className="primary" onClick={retry}>Réessayer</button>}
      </main>
    );
  }
  const person = state.people.find(p => p.id === me);
  if (!person) return <IdentityPicker people={state.people} onPick={setMe} />;
  return (
    <div className="app">
      <header className="app-header">
        <h1>🌴 {state.trip.name}</h1>
        <button className="link-btn" onClick={() => setMe(null)}>{person.name.split(' ')[0]} · changer</button>
      </header>
      {!online && <OfflineBanner />}
      <main className="app-main">
        {tab === 'envies' && <WishesTab />}
        {tab === 'planning' && <PlanningTab />}
        {tab === 'roadbook' && <RoadbookTab />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
      <Toasts />
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
      <Shell />
    </TripProvider>
  );
}
