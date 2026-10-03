import type { Person } from '../domain/types';

export function IdentityPicker({ people, onPick }: { people: Person[]; onPick: (id: string) => void }) {
  return (
    <main className="identity">
      <h1>🌴 Martinique 2027</h1>
      <p>Qui es-tu ?</p>
      <ul>
        {people.map(p => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)}>{p.name.split(' ')[0]}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
