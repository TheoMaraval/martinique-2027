import type { SheetState } from './PlanningContext';

export function PlanningSheets({ sheet, onClose }: { sheet: NonNullable<SheetState>; onClose: () => void }) {
  void sheet;
  void onClose;
  return null;
}
