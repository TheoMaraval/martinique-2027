export type Tab = 'envies' | 'planning' | 'roadbook';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'envies', label: 'Envies', icon: '🌴' },
  { id: 'planning', label: 'Planning', icon: '🗓️' },
  { id: 'roadbook', label: 'Road-book', icon: '🗺️' },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <span aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
