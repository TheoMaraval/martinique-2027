import type { Person } from '../domain/types';
import { firstName } from '../lib/format';
import { Avatar } from './Avatar';

export function PeoplePicker({ people, selected, onChange }: { people: Person[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <div className="people-picker">
      {people.map(p => (
        <button key={p.id} type="button" aria-pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
          <Avatar name={p.name} size="xs" />
          <span>{firstName(p.name)}</span>
        </button>
      ))}
    </div>
  );
}
