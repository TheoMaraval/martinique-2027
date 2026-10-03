import { Palmtree } from 'lucide-react';
import type { Person } from '../domain/types';
import { Avatar } from '../ui/Avatar';

export function IdentityPicker({ people, onPick }: { people: Person[]; onPick: (id: string) => void }) {
  return (
    <main className="identity">
      <div className="identity-hero">
        <span className="identity-logo"><Palmtree size={32} /></span>
        <h1>Martinique 2027</h1>
        <p>Qui es-tu ?</p>
      </div>
      <ul>
        {people.map(p => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)}>
              <Avatar name={p.name} size="md" />
              <span>{p.name.split(' ')[0]}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
