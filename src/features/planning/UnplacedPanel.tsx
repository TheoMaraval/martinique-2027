import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
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
  const names = item.personIds.map(id => firstName(state.people.find(p => p.id === id)?.name ?? '?')).join(', ');
  return (
    <li
      ref={setNodeRef} {...listeners} {...attributes}
      className={`unplaced-item ${n >= HOT_THRESHOLD ? 'hot' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => openSheet({ kind: 'place', item })}
    >
      <strong>{item.activity.name}{item.activity.has_quantity ? ` n°${item.occurrence}` : ''}</strong>
      <span className="badge">Suggérée par {n}</span>
      <span className="muted">{durationLabel(item.duration)}</span>
      <span className="names">{names}</span>
    </li>
  );
}

export function UnplacedPanel() {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const items = useMemo(() => unplacedItems(state), [state]);
  const [open, setOpen] = useState(true);
  return (
    <aside className="unplaced" aria-label="Activités à placer">
      <button className="unplaced-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        À placer ({items.length}) {open ? '▾' : '▴'}
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
          <button className="wide" onClick={() => openSheet({ kind: 'suggest' })}>+ Suggérer une nouvelle activité</button>
        </>
      )}
    </aside>
  );
}
