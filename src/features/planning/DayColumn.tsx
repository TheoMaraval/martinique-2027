import type { CSSProperties } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { PARTS, nightDates, slotIndex } from '../../domain/slots';
import { rosterAt, teamsOnDay } from '../../domain/teams';
import { formatDay } from '../../lib/format';
import { SlotCell } from './SlotCell';
import { NightCell } from './NightCell';

export function DayColumn({ date, columnRef }: { date: string; columnRef: (el: HTMLDivElement | null) => void }) {
  const { state } = useReadyTrip();
  const isNight = nightDates(state.trip).includes(date);
  return (
    <div className="day" ref={columnRef} data-date={date}>
      <h3 className="day-title">{formatDay(date)}</h3>
      {teamsOnDay(state, date).map(team => {
        const roster = new Set(PARTS.flatMap(p => rosterAt(state, team.id, slotIndex(state.trip, date, p))));
        return (
          <div key={team.id} className="team-block" style={{ '--team': team.color } as CSSProperties}>
            <div className="team-label">
              <span className="team-pill">{team.name}</span>
              <span className="team-count">{roster.size} pers.</span>
            </div>
            {PARTS.map(part => <SlotCell key={part} team={team} idx={slotIndex(state.trip, date, part)} />)}
            {isNight && <NightCell team={team} night={date} />}
          </div>
        );
      })}
    </div>
  );
}
