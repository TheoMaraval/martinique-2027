import { useCallback, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useReadyTrip } from '../../data/TripContext';
import { computeAlerts } from '../../domain/conflicts';
import { buildPlacedEvent, canDrop, movedEvent } from '../../domain/placement';
import type { UnplacedItem } from '../../domain/unplaced';
import { newId } from '../../lib/ids';
import { PlanningContext, type DragData, type DropData, type SheetState } from './PlanningContext';
import { AlertsBar } from './AlertsBar';
import { TeamsBar } from './TeamsBar';
import { PlanningGrid } from './PlanningGrid';
import { UnplacedPanel } from './UnplacedPanel';
import { PlanningSheets } from './PlanningSheets';
import { DragPreview } from './DragPreview';

const REFUSED = 'Impossible de placer cette activité sur ce créneau';

// Sous le pointeur d'abord ; à défaut, la cellule la plus proche.
const collision: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

export function PlanningTab() {
  const { state, actions, notify } = useReadyTrip();
  const [active, setActive] = useState<DragData | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const alerts = useMemo(() => computeAlerts(state), [state]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const place = useCallback((item: UnplacedItem, teamId: string, idx: number) => {
    if (!canDrop(state, teamId, idx, item.duration)) {
      notify(REFUSED);
      return false;
    }
    const { event, participantIds } = buildPlacedEvent(state, item, teamId, idx, newId());
    void actions.saveEvent(event, participantIds);
    return true;
  }, [state, actions, notify]);

  const moveEvent = useCallback((eventId: string, teamId: string, idx: number) => {
    const moved = movedEvent(state, eventId, teamId, idx);
    if (!moved) {
      notify(REFUSED);
      return false;
    }
    void actions.saveEvent(moved.event, moved.participantIds);
    return true;
  }, [state, actions, notify]);

  const onDragStart = (ev: DragStartEvent) => setActive((ev.active.data.current as DragData | undefined) ?? null);

  const onDragEnd = (ev: DragEndEvent) => {
    setActive(null);
    const target = ev.over?.data.current as DropData | undefined;
    const src = ev.active.data.current as DragData | undefined;
    if (!target || !src) return;
    if (src.type === 'wish') place(src.item, target.teamId, target.idx);
    else moveEvent(src.eventId, target.teamId, target.idx);
  };

  const close = useCallback(() => setSheet(null), []);

  return (
    <PlanningContext.Provider value={{ openSheet: setSheet, place, moveEvent, alerts }}>
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="planning">
          <AlertsBar />
          <TeamsBar />
          <PlanningGrid />
          <UnplacedPanel />
        </div>
        <DragOverlay>{active && <DragPreview data={active} />}</DragOverlay>
      </DndContext>
      {sheet && <PlanningSheets sheet={sheet} onClose={close} />}
    </PlanningContext.Provider>
  );
}
