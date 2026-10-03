import type { SheetState } from './PlanningContext';
import { EventSheet } from './EventSheet';
import { StaySheet } from './StaySheet';
import { TeamSheet } from './TeamSheet';
import { QuickAddSheet } from './QuickAddSheet';
import { PlaceSheet } from './PlaceSheet';
import { MoveSheet } from './MoveSheet';
import { SuggestSheet } from './SuggestSheet';

export function PlanningSheets({ sheet, onClose }: { sheet: NonNullable<SheetState>; onClose: () => void }) {
  switch (sheet.kind) {
    case 'event': return <EventSheet eventId={sheet.id} onClose={onClose} />;
    case 'stay': return <StaySheet teamId={sheet.teamId} night={sheet.night} onClose={onClose} />;
    case 'team': return <TeamSheet teamId={sheet.id} onClose={onClose} />;
    case 'quick': return <QuickAddSheet teamId={sheet.teamId} idx={sheet.idx} onClose={onClose} />;
    case 'place': return <PlaceSheet item={sheet.item} onClose={onClose} />;
    case 'move': return <MoveSheet eventId={sheet.eventId} onClose={onClose} />;
    case 'suggest': return <SuggestSheet onClose={onClose} />;
  }
}
