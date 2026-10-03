import { useCallback, useMemo, useState } from 'react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useReadyTrip } from '../../data/TripContext';
import { computeAlerts } from '../../domain/conflicts';
import { buildPlacedEvent, canDrop } from '../../domain/placement';
import { normalizeStart } from '../../domain/durations';
import { slotAt } from '../../domain/slots';
import type { UnplacedItem } from '../../domain/unplaced';
import { newId } from '../../lib/ids';
import { PlanningContext, type DragData, type DropData, type SheetState } from './PlanningContext';
import { AlertsBar } from './AlertsBar';
import { TeamsBar } from './TeamsBar';
import { PlanningGrid } from './PlanningGrid';
import { UnplacedPanel } from './UnplacedPanel';
import { PlanningSheets } from './PlanningSheets';

export function PlanningTab() {
  const { state, actions } = useReadyTrip();
  const [sheet, setSheet] = useState<SheetState>(null);
  const alerts = useMemo(() => computeAlerts(state), [state]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const place = useCallback((item: UnplacedItem, teamId: string, idx: number) => {
    if (!canDrop(state, teamId, idx, item.duration)) return;
    const { event, participantIds } = buildPlacedEvent(state, item, teamId, idx, newId());
    void actions.saveEvent(event, participantIds);
  }, [state, actions]);

  const move = (eventId: string, teamId: string, idx: number) => {
    const e = state.events.find(x => x.id === eventId);
    if (!e || !canDrop(state, teamId, idx, e.duration)) return;
    const start = normalizeStart(state.trip, e.duration, slotAt(state.trip, idx));
    void actions.saveEvent({ ...e, team_id: teamId, start_date: start.date, start_part: start.part });
  };

  const onDragEnd = (ev: DragEndEvent) => {
    const target = ev.over?.data.current as DropData | undefined;
    const src = ev.active.data.current as DragData | undefined;
    if (!target || !src) return;
    if (src.type === 'wish') place(src.item, target.teamId, target.idx);
    else move(src.eventId, target.teamId, target.idx);
  };

  const close = useCallback(() => setSheet(null), []);

  return (
    <PlanningContext.Provider value={{ openSheet: setSheet, place, alerts }}>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="planning">
          <AlertsBar />
          <TeamsBar />
          <PlanningGrid />
          <UnplacedPanel />
        </div>
      </DndContext>
      {sheet && <PlanningSheets sheet={sheet} onClose={close} />}
    </PlanningContext.Provider>
  );
}
