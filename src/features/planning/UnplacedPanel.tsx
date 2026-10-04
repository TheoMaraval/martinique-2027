import { useMemo, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import { unplacedItems, type UnplacedItem } from '../../domain/unplaced';
import { durationLabel } from '../../domain/durations';
import { firstName } from '../../lib/format';
import { usePlanning, type DragData } from './PlanningContext';

export const HOT_THRESHOLD = 3;

function UnplacedChip({ item }: { item: UnplacedItem }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const data: DragData = { type: 'wish', item };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `wish|${item.key}`, data });
  const n = item.personIds.length;
  const formula = durationLabel(item.duration);
  const names = item.personIds.map(id => firstName(state.people.find(p => p.id === id)?.name ?? '?')).join(', ');
  return (
    <li
      ref={setNodeRef} {...listeners} {...attributes}
      className={`unplaced-item ${formula ? '' : 'simple'} ${n >= HOT_THRESHOLD ? 'hot' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => openSheet({ kind: 'place', item })}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSheet({ kind: 'place', item });
        }
      }}
    >
      <span className="grip" aria-hidden="true"><GripVertical size={18} /></span>
      <strong>{item.activity.name}{item.activity.has_quantity ? ` n°${item.occurrence}` : ''}</strong>
      <span className="badge">Suggérée par {n}</span>
      {formula && <span className="muted">{formula}</span>}
      <span className="names">{names}</span>
    </li>
  );
}

export function UnplacedPanel() {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const items = useMemo(() => unplacedItems(state), [state]);
  const [open, setOpen] = useState(true);
  // Déposer ici = annuler le glisser-déposer.
  const { setNodeRef } = useDroppable({ id: 'cancel', data: { type: 'cancel' } });
  return (
    <aside ref={setNodeRef} className={`unplaced ${open ? 'open' : 'closed'}`} aria-label="Activités à placer">
      <span className="unplaced-grip" aria-hidden="true" />
      <button className="unplaced-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="unplaced-title">À placer</span>
        <span className={`count-pill ${items.length ? '' : 'is-empty'}`}>{items.length}</span>
        <span className="unplaced-chevron">{open ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</span>
      </button>
      {open && (
        <>
          {items.length === 0 ? (
            <p className="muted">Toutes les envies sont placées.</p>
          ) : (
            <>
              <p className="muted">Les plus suggérées en premier. Glisse une activité dans le planning, ou touche-la pour choisir le créneau.</p>
              <ul>{items.map(it => <UnplacedChip key={it.key} item={it} />)}</ul>
            </>
          )}
          <button className="wide" onClick={() => openSheet({ kind: 'suggest' })}><Plus size={18} /> Suggérer une nouvelle activité</button>
        </>
      )}
    </aside>
  );
}
