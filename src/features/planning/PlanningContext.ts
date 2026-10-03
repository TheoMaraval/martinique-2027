import { createContext, useContext } from 'react';
import type { Alert } from '../../domain/conflicts';
import type { UnplacedItem } from '../../domain/unplaced';

export type SheetState =
  | { kind: 'event'; id: string }
  | { kind: 'stay'; teamId: string; night: string }
  | { kind: 'team'; id: string | null }
  | { kind: 'quick'; teamId: string; idx: number }
  | { kind: 'place'; item: UnplacedItem }
  | { kind: 'move'; eventId: string }
  | { kind: 'suggest' }
  | null;

export interface PlanningCtx {
  openSheet(s: SheetState): void;
  /** Place une envie ; false (avec message) si le créneau est refusé. */
  place(item: UnplacedItem, teamId: string, idx: number): boolean;
  /** Déplace une activité ; false (avec message) si le créneau est refusé. */
  moveEvent(eventId: string, teamId: string, idx: number): boolean;
  alerts: Alert[];
}

export const PlanningContext = createContext<PlanningCtx>({ openSheet: () => {}, place: () => false, moveEvent: () => false, alerts: [] });
export const usePlanning = () => useContext(PlanningContext);

export type DragData = { type: 'wish'; item: UnplacedItem } | { type: 'event'; eventId: string };
export type DropData = { teamId: string; idx: number };
