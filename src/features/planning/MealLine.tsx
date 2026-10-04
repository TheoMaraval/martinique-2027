import { ExternalLink, UtensilsCrossed } from 'lucide-react';
import { useReadyTrip } from '../../data/TripContext';
import type { MealKind, Team } from '../../domain/types';
import { MEAL_LABEL, MEAL_PART } from '../../domain/itinerary';
import { buildSlots, slotIndex } from '../../domain/slots';
import { teamCovers } from '../../domain/teams';
import { isValidUrl } from '../../domain/validation';
import { usePlanning } from './PlanningContext';

/** Ligne « Déjeuner » (sous Midi) ou « Dîner » (sous Soir) d'une équipe : pour info, hors budget. */
export function MealLine({ team, date, kind }: { team: Team; date: string; kind: MealKind }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const idx = slotIndex(state.trip, date, MEAL_PART[kind]);
  if (!buildSlots(state.trip)[idx]?.plannable || !teamCovers(state, team, idx)) return null;
  const meal = state.meals.find(m => m.team_id === team.id && m.date === date && m.kind === kind);
  const open = () => openSheet({ kind: 'meal', teamId: team.id, date, meal: kind });
  const label = MEAL_LABEL[kind];
  if (!meal) {
    return (
      <div className="meal empty">
        <button type="button" className="meal-btn" onClick={open}>+ {label}</button>
      </div>
    );
  }
  const link = meal.links.find(l => isValidUrl(l.url));
  return (
    <div className="meal">
      <button type="button" className="meal-btn" onClick={open}>
        <UtensilsCrossed size={16} aria-hidden="true" />
        <span>{label} : {meal.place_name || 'à préciser'}</span>
      </button>
      {link && (
        <a href={link.url} target="_blank" rel="noreferrer noopener" aria-label={`Voir le ${label.toLowerCase()} : ${link.label}`} className="meal-link">
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}
