import { CalendarDays, Map as MapIcon, Palmtree, type LucideIcon } from 'lucide-react';

export type Tab = 'envies' | 'planning' | 'roadbook';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'envies', label: 'Envies', Icon: Palmtree },
  { id: 'planning', label: 'Planning', Icon: CalendarDays },
  { id: 'roadbook', label: 'Road-book', Icon: MapIcon },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Onglets">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <span className="nav-icon"><Icon size={20} /></span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
