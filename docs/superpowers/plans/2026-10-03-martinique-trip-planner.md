# Martinique 2027 — Organisateur de voyage : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app collaborative temps réel (10 amis) : onglet Envies (choix d'activités + budget), onglet Planning (glisser-déposer dans une grille Matin/Après-midi/Soir/Nuit avec équipes parallèles, lieux GPS, prix, liens, commentaires), onglet Road-book (récap, carte, dépenses).

**Architecture:** SPA React statique hébergée sur GitHub Pages ; Supabase Postgres comme unique backend, accédé exclusivement via fonctions RPC `security definer` vérifiant un code secret de voyage ; synchronisation temps réel par Supabase Realtime Broadcast (signal `changed` → rechargement de l'état). Toute la logique métier (créneaux, durées, équipes, envies non placées, conflits, dépenses, itinéraire) est en fonctions pures TypeScript testées en TDD.

**Tech Stack:** React 19, Vite, TypeScript, Vitest + React Testing Library, @supabase/supabase-js, @dnd-kit/core, Leaflet + react-leaflet (OpenStreetMap, Nominatim), GitHub Actions + Pages.

**Spec :** `docs/superpowers/specs/2026-10-03-martinique-trip-planner-design.md`

**Conventions :**
- Shell : Git Bash (Windows). Toutes les commandes depuis la racine `C:\Users\TMARAVAL\code\MartiniqueApp`.
- Commits : message en français, terminer par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Interface 100 % en français.

---

## Structure des fichiers

```
index.html                         Page HTML Vite
package.json / tsconfig.json / vite.config.ts
.env.example                       Variables Supabase (modèle)
.github/workflows/deploy.yml       Test + build + déploiement Pages
README.md
supabase/migrations/0001_schema.sql   Tables + RLS
supabase/migrations/0002_rpc.sql      Fonctions RPC + droits
supabase/seed.sql                      Voyage, 10 personnes, catalogue, équipe par défaut
src/
  main.tsx                         Point d'entrée
  App.tsx                          Routage hash, coquille (en-tête, onglets)
  styles.css                       Styles globaux mobile-first
  lib/ids.ts                       newId()
  lib/format.ts                    Formats date/€/prénom
  lib/geocode.ts                   Recherche d'adresse Nominatim
  domain/types.ts                  Types partagés
  domain/slots.ts                  Créneaux, dates, nuits
  domain/durations.ts              Codes durée, emprise
  domain/teams.ts                  Équipes, effectifs par créneau
  domain/unplaced.ts               Envies non placées « Suggérée par N »
  domain/placement.ts              Création d'une activité planifiée depuis une envie
  domain/conflicts.ts              Alertes (chevauchements, nuits sans logement…)
  domain/expenses.ts               Parts et dépenses par personne
  domain/itinerary.ts              Road-book jour par jour + points de carte
  domain/validation.ts             URL, GPS, prix
  data/supabase.ts                 Client Supabase
  data/api.ts                      Wrappers RPC + messages d'erreur
  data/local.ts                    Helpers de mise à jour optimiste
  data/TripContext.ts              Contexte React + types + hooks (sans Supabase)
  data/TripProvider.tsx            Chargement, mutations optimistes, temps réel
  identity/identity.ts             Identité mémorisée (localStorage)
  identity/IdentityPicker.tsx      Écran « Qui es-tu ? »
  ui/BottomNav.tsx  ui/Feedback.tsx  ui/Sheet.tsx  ui/Field.tsx
  ui/Links.tsx (LinkList + LinksEditor)  ui/PeoplePicker.tsx  ui/PriceField.tsx
  ui/MapPicker.tsx  ui/PlaceField.tsx
  features/wishes/WishesTab.tsx  ProfileCard.tsx  ActivityCard.tsx  AddActivityForm.tsx
  features/planning/PlanningContext.ts  PlanningTab.tsx  PlanningGrid.tsx  DayColumn.tsx
  features/planning/SlotCell.tsx  EventTile.tsx  NightCell.tsx  UnplacedPanel.tsx
  features/planning/TeamsBar.tsx  AlertsBar.tsx  PlanningSheets.tsx  EventSheet.tsx
  features/planning/CommentsThread.tsx  StaySheet.tsx  TeamSheet.tsx  QuickAddSheet.tsx  PlaceSheet.tsx
  features/roadbook/RoadbookTab.tsx  ExpensesTable.tsx  RouteMap.tsx  DayRecap.tsx
  test/setup.ts  test/fixtures.ts  test/renderWithTrip.tsx
```

---

### Task 1: Initialisation du projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/test/setup.ts`

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "martinique-2027",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Installer les dépendances**

Run:
```bash
npm install react react-dom @supabase/supabase-js @dnd-kit/core leaflet react-leaflet
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/leaflet
```
Expected: `added N packages`, aucune erreur `ERESOLVE`.

- [ ] **Step 3: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Créer `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/martinique-2027/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-key' },
  },
});
```

- [ ] **Step 5: Créer `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0e9aa7" />
    <title>Martinique 2027</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌴</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Créer `.gitignore`, `.env.example`, `src/test/setup.ts`, `src/main.tsx` (provisoire)**

`.gitignore` :
```
node_modules
dist
.env
.env.local
```

`.env.example` :
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

`src/test/setup.ts` :
```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

`src/main.tsx` (remplacé en Task 15) :
```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<p>Martinique 2027</p>);
```

- [ ] **Step 7: Vérifier build et tests**

Run: `npm run build && npx vitest run --passWithNoTests`
Expected: build `✓ built in …`, vitest `No test files found, exiting with code 0`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialisation Vite + React + Vitest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types du domaine et fixtures de test

**Files:**
- Create: `src/domain/types.ts`, `src/test/fixtures.ts`, `src/lib/ids.ts`, `src/lib/format.ts`

- [ ] **Step 1: Créer `src/domain/types.ts`**

```ts
export type Part = 'matin' | 'aprem' | 'soir';
/** 'half' | 'day' | 'evening' | `multi:${jours}:${nuits}` */
export type DurationKey = string;
export type PriceMode = 'total' | 'per_person';

export interface Link { url: string; label: string }

export interface Trip { id: string; name: string; start_date: string; end_date: string }
export interface Person { id: string; trip_id: string; name: string; budget_max: number | null; sort: number }
export interface Activity {
  id: string; trip_id: string; name: string; category: string; durations: DurationKey[];
  has_quantity: boolean; description: string; links: Link[]; is_custom: boolean; created_by: string | null;
}
export interface Wish {
  id: string; trip_id: string; person_id: string; activity_id: string; duration: DurationKey; quantity: number;
}
export interface Team {
  id: string; trip_id: string; name: string; color: string;
  start_date: string; start_part: Part; end_date: string; end_part: Part; is_default: boolean;
}
export interface TeamMember { trip_id: string; team_id: string; person_id: string }
export interface TripEvent {
  id: string; trip_id: string; team_id: string; activity_id: string; duration: DurationKey; occurrence: number;
  start_date: string; start_part: Part; place_name: string; lat: number | null; lng: number | null;
  price: number | null; price_mode: PriceMode; links: Link[]; notes: string;
}
export interface EventParticipant { trip_id: string; event_id: string; person_id: string }
export interface EventComment {
  id: string; trip_id: string; event_id: string; author_id: string; body: string; created_at: string;
}
export interface Stay {
  id: string; trip_id: string; team_id: string; night_date: string; place_name: string;
  lat: number | null; lng: number | null; price: number | null; price_mode: PriceMode; links: Link[]; notes: string;
}
export interface TripState {
  trip: Trip; people: Person[]; activities: Activity[]; wishes: Wish[]; teams: Team[];
  team_members: TeamMember[]; events: TripEvent[]; event_participants: EventParticipant[];
  event_comments: EventComment[]; stays: Stay[];
}
```

- [ ] **Step 2: Créer `src/test/fixtures.ts`**

```ts
import type { Activity, Stay, Team, TripEvent, TripState } from '../domain/types';

export const TRIP = { id: 'trip', name: 'Martinique 2027', start_date: '2027-04-15', end_date: '2027-04-25' };

export function makeActivity(id: string, name: string, category: string, durations: string[], has_quantity = false): Activity {
  return { id, trip_id: 'trip', name, category, durations, has_quantity, description: '', links: [], is_custom: false, created_by: null };
}

export function makeTeam(p: Partial<Team> & Pick<Team, 'id'>): Team {
  return {
    trip_id: 'trip', name: p.id, color: '#ff6f59', start_date: '2027-04-15', start_part: 'matin',
    end_date: '2027-04-25', end_part: 'soir', is_default: false, ...p,
  };
}

export function makeEvent(
  p: Partial<TripEvent> & Pick<TripEvent, 'id' | 'activity_id' | 'duration' | 'start_date' | 'start_part'>,
): TripEvent {
  return {
    trip_id: 'trip', team_id: 'all', occurrence: 1, place_name: '', lat: null, lng: null,
    price: null, price_mode: 'total', links: [], notes: '', ...p,
  };
}

export function makeStay(p: Partial<Stay> & Pick<Stay, 'id' | 'night_date'>): Stay {
  return {
    trip_id: 'trip', team_id: 'all', place_name: '', lat: null, lng: null,
    price: null, price_mode: 'total', links: [], notes: '', ...p,
  };
}

export function participants(eventId: string, ids: string[]) {
  return ids.map(person_id => ({ trip_id: 'trip', event_id: eventId, person_id }));
}

export function members(teamId: string, ids: string[]) {
  return ids.map(person_id => ({ trip_id: 'trip', team_id: teamId, person_id }));
}

export function makeState(over: Partial<TripState> = {}): TripState {
  return {
    trip: TRIP,
    people: ['Théo', 'Jules', 'Inès', 'Louise'].map((name, i) => ({
      id: `p${i + 1}`, trip_id: 'trip', name, budget_max: 1000, sort: i,
    })),
    activities: [
      makeActivity('boat', 'Bateau multi-jours', 'Bateau', ['multi:4:3', 'multi:3:3', 'multi:3:2']),
      makeActivity('surf', 'Surf', 'Mer', ['half', 'day']),
      makeActivity('rando', 'Randonnée', 'Nature', ['half', 'day'], true),
    ],
    wishes: [],
    teams: [makeTeam({ id: 'all', name: 'Tout le groupe', color: '#0e9aa7', is_default: true })],
    team_members: [], events: [], event_participants: [], event_comments: [], stays: [],
    ...over,
  };
}
```

- [ ] **Step 3: Créer `src/lib/ids.ts`**

```ts
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
```

- [ ] **Step 4: Créer `src/lib/format.ts`**

```ts
const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const euroFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatDayShort = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatEuros = (n: number) => euroFmt.format(n);
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const firstName = (name: string) => name.split(' ')[0];
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npx tsc`
Expected: aucune sortie (succès).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: types du domaine, fixtures et utilitaires

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Créneaux (`slots.ts`)

**Files:**
- Create: `src/domain/slots.ts`
- Test: `src/domain/slots.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { addDays, buildSlots, nightDates, slotAt, slotIndex, tripDates } from './slots';
import { TRIP } from '../test/fixtures';

describe('slots', () => {
  it('liste les 11 jours du voyage', () => {
    const d = tripDates(TRIP);
    expect(d).toHaveLength(11);
    expect(d[0]).toBe('2027-04-15');
    expect(d[10]).toBe('2027-04-25');
  });

  it('addDays traverse les mois', () => {
    expect(addDays('2027-04-30', 1)).toBe('2027-05-01');
  });

  it('construit 33 créneaux avec les vols bloqués', () => {
    const s = buildSlots(TRIP);
    expect(s).toHaveLength(33);
    expect(s[0]).toMatchObject({ date: '2027-04-15', part: 'matin', plannable: false, blockedLabel: 'Vol aller' });
    expect(s[1].plannable).toBe(true);
    expect(s[30]).toMatchObject({ date: '2027-04-25', part: 'matin', plannable: true });
    expect(s[31]).toMatchObject({ plannable: false, blockedLabel: 'Départ' });
    expect(s[32].plannable).toBe(false);
  });

  it('convertit date/moment <-> index', () => {
    expect(slotIndex(TRIP, '2027-04-16', 'soir')).toBe(5);
    expect(slotAt(TRIP, 5)).toEqual({ date: '2027-04-16', part: 'soir' });
  });

  it('refuse une date hors voyage', () => {
    expect(() => slotIndex(TRIP, '2027-05-01', 'matin')).toThrow();
  });

  it('compte 10 nuits du 15 au 24', () => {
    const n = nightDates(TRIP);
    expect(n).toHaveLength(10);
    expect(n[0]).toBe('2027-04-15');
    expect(n[9]).toBe('2027-04-24');
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/slots.test.ts`
Expected: FAIL — `Failed to resolve import "./slots"`.

- [ ] **Step 3: Implémenter `src/domain/slots.ts`**

```ts
import type { Part, Trip } from './types';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;

export const PARTS: Part[] = ['matin', 'aprem', 'soir'];
export const PART_LABEL: Record<Part, string> = { matin: 'Matin', aprem: 'Après-midi', soir: 'Soir' };

export interface Slot { index: number; date: string; part: Part; plannable: boolean; blockedLabel?: string }

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function tripDates(trip: TripDates): string[] {
  const out: string[] = [];
  for (let d = trip.start_date; d <= trip.end_date; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Le premier matin (vol aller) et les après-midi/soir du dernier jour (départ) ne sont pas planifiables. */
export function buildSlots(trip: TripDates): Slot[] {
  const dates = tripDates(trip);
  const last = dates.length - 1;
  return dates.flatMap((date, di) =>
    PARTS.map((part, pi): Slot => {
      const index = di * 3 + pi;
      if (di === 0 && part === 'matin') return { index, date, part, plannable: false, blockedLabel: 'Vol aller' };
      if (di === last && part !== 'matin') return { index, date, part, plannable: false, blockedLabel: 'Départ' };
      return { index, date, part, plannable: true };
    }),
  );
}

export function slotIndex(trip: TripDates, date: string, part: Part): number {
  const di = tripDates(trip).indexOf(date);
  if (di < 0) throw new Error(`Date hors voyage : ${date}`);
  return di * 3 + PARTS.indexOf(part);
}

export function slotAt(trip: TripDates, index: number): { date: string; part: Part } {
  return { date: addDays(trip.start_date, Math.floor(index / 3)), part: PARTS[index % 3] };
}

export function isPlannable(trip: TripDates, index: number): boolean {
  return buildSlots(trip)[index]?.plannable ?? false;
}

export function nightDates(trip: TripDates): string[] {
  return tripDates(trip).slice(0, -1);
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/slots.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): créneaux du voyage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Durées et emprise (`durations.ts`)

**Files:**
- Create: `src/domain/durations.ts`
- Test: `src/domain/durations.test.ts`

Règles : `half` = 1 créneau (celui choisi) ; `evening` = le soir du jour ; `day` = matin + après-midi ; `multi:J:N` = du créneau de départ jusqu'au soir du jour J, nuits du jour de départ jusqu'à N nuits. Les créneaux non planifiables et les nuits hors voyage sont retirés.

- [ ] **Step 1: Écrire le test**

```ts
import { durationLabel, multiKey, normalizeStart, parseDuration, spanOf } from './durations';
import { TRIP } from '../test/fixtures';

describe('durations', () => {
  it('parse les codes', () => {
    expect(parseDuration('half')).toEqual({ kind: 'half' });
    expect(parseDuration('multi:4:3')).toEqual({ kind: 'multi', days: 4, nights: 3 });
    expect(() => parseDuration('xx')).toThrow();
  });

  it('libellés', () => {
    expect(durationLabel('half')).toBe('Demi-journée');
    expect(durationLabel('day')).toBe('Journée');
    expect(durationLabel('evening')).toBe('Soir');
    expect(durationLabel(multiKey(3, 2))).toBe('3j/2n');
  });

  it('normalise le départ', () => {
    expect(normalizeStart(TRIP, 'day', { date: '2027-04-16', part: 'soir' })).toEqual({ date: '2027-04-16', part: 'matin' });
    expect(normalizeStart(TRIP, 'day', { date: '2027-04-15', part: 'soir' })).toEqual({ date: '2027-04-15', part: 'aprem' });
    expect(normalizeStart(TRIP, 'evening', { date: '2027-04-16', part: 'matin' })).toEqual({ date: '2027-04-16', part: 'soir' });
    expect(normalizeStart(TRIP, 'half', { date: '2027-04-16', part: 'aprem' })).toEqual({ date: '2027-04-16', part: 'aprem' });
  });

  it('emprise demi-journée et soir', () => {
    expect(spanOf(TRIP, 'half', { date: '2027-04-16', part: 'aprem' })).toEqual({ slots: [4], nights: [] });
    expect(spanOf(TRIP, 'evening', { date: '2027-04-16', part: 'matin' })).toEqual({ slots: [5], nights: [] });
  });

  it('emprise journée (le 15 matin est bloqué)', () => {
    expect(spanOf(TRIP, 'day', { date: '2027-04-16', part: 'matin' }).slots).toEqual([3, 4]);
    expect(spanOf(TRIP, 'day', { date: '2027-04-15', part: 'matin' }).slots).toEqual([1]);
  });

  it('emprise bateau 4j/3n', () => {
    const s = spanOf(TRIP, 'multi:4:3', { date: '2027-04-17', part: 'matin' });
    expect(s.slots).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(s.nights).toEqual(['2027-04-17', '2027-04-18', '2027-04-19']);
  });

  it('coupe ce qui dépasse le voyage', () => {
    const s = spanOf(TRIP, 'multi:3:3', { date: '2027-04-23', part: 'matin' });
    expect(s.slots).toEqual([24, 25, 26, 27, 28, 29, 30]);
    expect(s.nights).toEqual(['2027-04-23', '2027-04-24']);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/durations.test.ts`
Expected: FAIL — `Failed to resolve import "./durations"`.

- [ ] **Step 3: Implémenter `src/domain/durations.ts`**

```ts
import type { DurationKey, Part, Trip } from './types';
import { addDays, buildSlots, isPlannable, nightDates, slotIndex } from './slots';

type TripDates = Pick<Trip, 'start_date' | 'end_date'>;
type Start = { date: string; part: Part };

export type ParsedDuration =
  | { kind: 'half' }
  | { kind: 'day' }
  | { kind: 'evening' }
  | { kind: 'multi'; days: number; nights: number };

export interface Span { slots: number[]; nights: string[] }

export function parseDuration(key: DurationKey): ParsedDuration {
  if (key === 'half' || key === 'day' || key === 'evening') return { kind: key };
  const m = /^multi:(\d+):(\d+)$/.exec(key);
  if (m) return { kind: 'multi', days: Number(m[1]), nights: Number(m[2]) };
  throw new Error(`Durée inconnue : ${key}`);
}

export const multiKey = (days: number, nights: number): DurationKey => `multi:${days}:${nights}`;

export function durationLabel(key: DurationKey): string {
  const p = parseDuration(key);
  if (p.kind === 'half') return 'Demi-journée';
  if (p.kind === 'day') return 'Journée';
  if (p.kind === 'evening') return 'Soir';
  return `${p.days}j/${p.nights}n`;
}

export function normalizeStart(trip: TripDates, key: DurationKey, start: Start): Start {
  const p = parseDuration(key);
  if (p.kind === 'evening') return { date: start.date, part: 'soir' };
  if (p.kind === 'day') {
    const morningOk = isPlannable(trip, slotIndex(trip, start.date, 'matin'));
    return { date: start.date, part: morningOk ? 'matin' : 'aprem' };
  }
  return start;
}

export function spanOf(trip: TripDates, key: DurationKey, start: Start): Span {
  const p = parseDuration(key);
  const s = normalizeStart(trip, key, start);
  const i = slotIndex(trip, s.date, s.part);
  let slots: number[];
  let nights: string[] = [];
  if (p.kind === 'half' || p.kind === 'evening') {
    slots = [i];
  } else if (p.kind === 'day') {
    slots = [slotIndex(trip, s.date, 'matin'), slotIndex(trip, s.date, 'aprem')];
  } else {
    const end = (Math.floor(i / 3) + p.days - 1) * 3 + 2;
    slots = Array.from({ length: end - i + 1 }, (_, k) => i + k);
    nights = Array.from({ length: p.nights }, (_, k) => addDays(s.date, k));
  }
  const all = buildSlots(trip);
  const validNights = new Set(nightDates(trip));
  return {
    slots: slots.filter(x => all[x]?.plannable),
    nights: nights.filter(n => validNights.has(n)),
  };
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/durations.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): durées et emprise des activités

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Équipes (`teams.ts`)

**Files:**
- Create: `src/domain/teams.ts`
- Test: `src/domain/teams.test.ts`

Règle : l'équipe par défaut (« Tout le groupe ») contient, pour un créneau donné, toutes les personnes qui ne sont dans aucune autre équipe couvrant ce créneau.

- [ ] **Step 1: Écrire le test**

```ts
import { effectiveTeamIds, rosterAt, teamsOnDay } from './teams';
import { makeState, makeTeam, members } from '../test/fixtures';
import { slotIndex } from './slots';

const boatTeam = makeTeam({ id: 'bt', name: 'Équipe bateau', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
const s = makeState({ teams: [...makeState().teams, boatTeam], team_members: members('bt', ['p1', 'p2']) });
const idx = (date: string, part: 'matin' | 'aprem' | 'soir') => slotIndex(s.trip, date, part);

describe('teams', () => {
  it("répartit l'effectif entre équipe par défaut et équipe parallèle", () => {
    expect(rosterAt(s, 'all', idx('2027-04-18', 'aprem'))).toEqual(['p3', 'p4']);
    expect(rosterAt(s, 'bt', idx('2027-04-18', 'aprem'))).toEqual(['p1', 'p2']);
  });

  it("une équipe hors de sa plage n'a personne", () => {
    expect(rosterAt(s, 'bt', idx('2027-04-16', 'matin'))).toEqual([]);
    expect(rosterAt(s, 'all', idx('2027-04-16', 'matin'))).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('donne les équipes effectives', () => {
    expect(effectiveTeamIds(s, 'p1', idx('2027-04-16', 'matin'))).toEqual(['all']);
    expect(effectiveTeamIds(s, 'p1', idx('2027-04-17', 'matin'))).toEqual(['bt']);
  });

  it('liste les équipes du jour, défaut en premier', () => {
    expect(teamsOnDay(s, '2027-04-16').map(t => t.id)).toEqual(['all']);
    expect(teamsOnDay(s, '2027-04-17').map(t => t.id)).toEqual(['all', 'bt']);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/teams.test.ts`
Expected: FAIL — `Failed to resolve import "./teams"`.

- [ ] **Step 3: Implémenter `src/domain/teams.ts`**

```ts
import type { Team, TripState } from './types';
import { slotIndex } from './slots';

export function teamRange(s: TripState, t: Team): [number, number] {
  return [slotIndex(s.trip, t.start_date, t.start_part), slotIndex(s.trip, t.end_date, t.end_part)];
}

export function teamCovers(s: TripState, t: Team, idx: number): boolean {
  const [a, b] = teamRange(s, t);
  return idx >= a && idx <= b;
}

export function defaultTeam(s: TripState): Team {
  const t = s.teams.find(x => x.is_default);
  if (!t) throw new Error('Équipe par défaut manquante');
  return t;
}

export function membersOf(s: TripState, teamId: string): string[] {
  return s.team_members.filter(m => m.team_id === teamId).map(m => m.person_id);
}

/** Équipes non-défaut couvrant le créneau et contenant la personne ; sinon l'équipe par défaut. */
export function effectiveTeamIds(s: TripState, personId: string, idx: number): string[] {
  const ids = s.teams
    .filter(t => !t.is_default && teamCovers(s, t, idx) && membersOf(s, t.id).includes(personId))
    .map(t => t.id);
  return ids.length ? ids : [defaultTeam(s).id];
}

export function rosterAt(s: TripState, teamId: string, idx: number): string[] {
  const team = s.teams.find(t => t.id === teamId);
  if (!team) return [];
  if (!team.is_default) return teamCovers(s, team, idx) ? membersOf(s, team.id) : [];
  return s.people.filter(p => effectiveTeamIds(s, p.id, idx).includes(team.id)).map(p => p.id);
}

export function teamsOnDay(s: TripState, date: string): Team[] {
  const first = slotIndex(s.trip, date, 'matin');
  const last = first + 2;
  const others = s.teams
    .filter(t => !t.is_default)
    .filter(t => {
      const [a, b] = teamRange(s, t);
      return a <= last && b >= first;
    })
    .sort((x, y) => teamRange(s, x)[0] - teamRange(s, y)[0] || x.name.localeCompare(y.name, 'fr'));
  return [defaultTeam(s), ...others];
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/teams.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): équipes parallèles et effectifs par créneau

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Envies non placées (`unplaced.ts`)

**Files:**
- Create: `src/domain/unplaced.ts`
- Test: `src/domain/unplaced.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { unplacedItems } from './unplaced';
import { makeEvent, makeState } from '../test/fixtures';
import type { Wish } from './types';

const wish = (id: string, person_id: string, activity_id: string, duration: string, quantity = 1): Wish =>
  ({ id, trip_id: 'trip', person_id, activity_id, duration, quantity });

const wishes = [
  wish('w1', 'p1', 'surf', 'half'), wish('w2', 'p2', 'surf', 'half'), wish('w3', 'p3', 'surf', 'half'),
  wish('w4', 'p1', 'rando', 'half', 2), wish('w5', 'p2', 'rando', 'half', 1),
  wish('w6', 'p4', 'boat', 'multi:4:3'),
];

describe('unplacedItems', () => {
  it('groupe, éclate les quantités et trie par nombre de suggestions', () => {
    const items = unplacedItems(makeState({ wishes }));
    expect(items.map(i => [i.activity.id, i.occurrence, i.personIds])).toEqual([
      ['surf', 1, ['p1', 'p2', 'p3']],
      ['rando', 1, ['p1', 'p2']],
      ['boat', 1, ['p4']],
      ['rando', 2, ['p1']],
    ]);
  });

  it('retire les éléments déjà placés', () => {
    const events = [makeEvent({ id: 'e1', activity_id: 'rando', duration: 'half', occurrence: 1, start_date: '2027-04-16', start_part: 'matin' })];
    const items = unplacedItems(makeState({ wishes, events }));
    expect(items.map(i => `${i.activity.id}#${i.occurrence}`)).toEqual(['surf#1', 'boat#1', 'rando#2']);
  });

  it('ignore la quantité si l’activité n’en a pas', () => {
    const items = unplacedItems(makeState({ wishes: [wish('w', 'p1', 'surf', 'day', 3)] }));
    expect(items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/unplaced.test.ts`
Expected: FAIL — `Failed to resolve import "./unplaced"`.

- [ ] **Step 3: Implémenter `src/domain/unplaced.ts`**

```ts
import type { Activity, DurationKey, TripState, Wish } from './types';

export interface UnplacedItem {
  key: string; activity: Activity; duration: DurationKey; occurrence: number; personIds: string[];
}

export const placementKey = (activityId: string, duration: DurationKey, occurrence: number) =>
  `${activityId}|${duration}|${occurrence}`;

export function unplacedItems(s: TripState): UnplacedItem[] {
  const groups = new Map<string, Wish[]>();
  for (const w of s.wishes) {
    const k = `${w.activity_id}|${w.duration}`;
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }
  const placed = new Set(s.events.map(e => placementKey(e.activity_id, e.duration, e.occurrence)));
  const items: UnplacedItem[] = [];
  for (const ws of groups.values()) {
    const activity = s.activities.find(a => a.id === ws[0].activity_id);
    if (!activity) continue;
    const qty = (w: Wish) => (activity.has_quantity ? w.quantity : 1);
    const max = Math.max(...ws.map(qty));
    for (let occ = 1; occ <= max; occ++) {
      const key = placementKey(activity.id, ws[0].duration, occ);
      if (placed.has(key)) continue;
      items.push({
        key, activity, duration: ws[0].duration, occurrence: occ,
        personIds: ws.filter(w => qty(w) >= occ).map(w => w.person_id),
      });
    }
  }
  return items.sort(
    (a, b) =>
      b.personIds.length - a.personIds.length ||
      a.activity.name.localeCompare(b.activity.name, 'fr') ||
      a.occurrence - b.occurrence,
  );
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/unplaced.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): envies non placées triées par suggestions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Placement (`placement.ts`)

**Files:**
- Create: `src/domain/placement.ts`
- Test: `src/domain/placement.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { buildPlacedEvent, canDrop, nextOccurrence } from './placement';
import { makeEvent, makeState, makeTeam, members } from '../test/fixtures';
import type { UnplacedItem } from './unplaced';

const s = makeState();
const item = (activityId: string, duration: string, personIds: string[]): UnplacedItem => ({
  key: 'k', activity: s.activities.find(a => a.id === activityId)!, duration, occurrence: 1, personIds,
});

describe('placement', () => {
  it("préremplit avec les membres de l'équipe qui l'ont suggérée", () => {
    const { event, participantIds } = buildPlacedEvent(s, item('surf', 'half', ['p1', 'p2']), 'all', 3, 'e1');
    expect(event).toMatchObject({ id: 'e1', team_id: 'all', activity_id: 'surf', start_date: '2027-04-16', start_part: 'matin', occurrence: 1 });
    expect(participantIds).toEqual(['p1', 'p2']);
  });

  it("prend toute l'équipe si personne de l'équipe ne l'a suggérée", () => {
    const { participantIds } = buildPlacedEvent(s, item('surf', 'half', []), 'all', 3, 'e1');
    expect(participantIds).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('normalise une journée déposée le soir', () => {
    const { event } = buildPlacedEvent(s, item('surf', 'day', ['p1']), 'all', 5, 'e1');
    expect(event.start_part).toBe('matin');
  });

  it('refuse les créneaux bloqués ou hors équipe', () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const st = makeState({ teams: [...s.teams, bt], team_members: members('bt', ['p1']) });
    expect(canDrop(st, 'all', 0)).toBe(false);
    expect(canDrop(st, 'bt', 3)).toBe(false);
    expect(canDrop(st, 'bt', 6)).toBe(true);
  });

  it('trouve la prochaine occurrence libre', () => {
    const events = [1, 3].map(o => makeEvent({ id: `e${o}`, activity_id: 'rando', duration: 'half', occurrence: o, start_date: '2027-04-16', start_part: 'matin' }));
    expect(nextOccurrence(makeState({ events }), 'rando', 'half')).toBe(2);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/placement.test.ts`
Expected: FAIL — `Failed to resolve import "./placement"`.

- [ ] **Step 3: Implémenter `src/domain/placement.ts`**

```ts
import type { DurationKey, TripEvent, TripState } from './types';
import type { UnplacedItem } from './unplaced';
import { buildSlots, slotAt, slotIndex } from './slots';
import { normalizeStart } from './durations';
import { rosterAt, teamCovers } from './teams';

export function canDrop(s: TripState, teamId: string, idx: number): boolean {
  const team = s.teams.find(t => t.id === teamId);
  const slot = buildSlots(s.trip)[idx];
  return !!team && !!slot && slot.plannable && teamCovers(s, team, idx);
}

export function buildPlacedEvent(
  s: TripState, item: UnplacedItem, teamId: string, idx: number, id: string,
): { event: TripEvent; participantIds: string[] } {
  const start = normalizeStart(s.trip, item.duration, slotAt(s.trip, idx));
  const roster = rosterAt(s, teamId, slotIndex(s.trip, start.date, start.part));
  const interested = roster.filter(p => item.personIds.includes(p));
  return {
    event: {
      id, trip_id: s.trip.id, team_id: teamId, activity_id: item.activity.id, duration: item.duration,
      occurrence: item.occurrence, start_date: start.date, start_part: start.part, place_name: '',
      lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '',
    },
    participantIds: interested.length ? interested : roster,
  };
}

export function nextOccurrence(s: TripState, activityId: string, duration: DurationKey): number {
  const used = new Set(s.events.filter(e => e.activity_id === activityId && e.duration === duration).map(e => e.occurrence));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/placement.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): placement d'une envie dans le planning

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Alertes (`conflicts.ts`)

**Files:**
- Create: `src/domain/conflicts.ts`
- Test: `src/domain/conflicts.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { computeAlerts } from './conflicts';
import { makeEvent, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

describe('computeAlerts', () => {
  it('détecte deux activités qui se chevauchent', () => {
    const s = makeState({
      events: [
        makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e2', activity_id: 'rando', duration: 'day', start_date: '2027-04-16', start_part: 'matin' }),
        makeEvent({ id: 'e3', activity_id: 'surf', duration: 'half', start_date: '2027-04-17', start_part: 'matin' }),
      ],
      event_participants: [...participants('e1', ['p1']), ...participants('e2', ['p1']), ...participants('e3', ['p1'])],
    });
    expect(computeAlerts(s).filter(a => a.kind === 'overlap')).toEqual([{ kind: 'overlap', personId: 'p1', eventIds: ['e1', 'e2'] }]);
  });

  it('détecte une personne dans deux équipes en même temps', () => {
    const a = makeTeam({ id: 'A', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-18', end_part: 'soir' });
    const b = makeTeam({ id: 'B', start_date: '2027-04-18', start_part: 'matin', end_date: '2027-04-19', end_part: 'soir' });
    const s = makeState({ teams: [...makeState().teams, a, b], team_members: [...members('A', ['p1']), ...members('B', ['p1'])] });
    expect(computeAlerts(s).filter(x => x.kind === 'two-teams')).toEqual([{ kind: 'two-teams', personId: 'p1', teamIds: ['A', 'B'] }]);
  });

  it('signale les nuits sans logement, hors nuits à bord', () => {
    const bt = makeTeam({ id: 'bt', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
    const s = makeState({
      teams: [...makeState().teams, bt],
      team_members: members('bt', ['p1']),
      stays: [makeStay({ id: 's1', night_date: '2027-04-15' })],
      events: [makeEvent({ id: 'b', team_id: 'bt', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin' })],
      event_participants: participants('b', ['p1']),
    });
    const nights = computeAlerts(s).filter(a => a.kind === 'no-stay' && a.personId === 'p1').map(a => (a as { night: string }).night);
    expect(nights).toEqual(['2027-04-16', '2027-04-20', '2027-04-21', '2027-04-22', '2027-04-23', '2027-04-24']);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/conflicts.test.ts`
Expected: FAIL — `Failed to resolve import "./conflicts"`.

- [ ] **Step 3: Implémenter `src/domain/conflicts.ts`**

```ts
import type { Stay, TripEvent, TripState } from './types';
import { spanOf, type Span } from './durations';
import { nightDates, slotIndex } from './slots';
import { effectiveTeamIds, membersOf, teamRange } from './teams';

export type Alert =
  | { kind: 'overlap'; personId: string; eventIds: [string, string] }
  | { kind: 'two-teams'; personId: string; teamIds: [string, string] }
  | { kind: 'no-stay'; personId: string; night: string };

export function participantsOf(s: TripState, eventId: string): string[] {
  return s.event_participants.filter(p => p.event_id === eventId).map(p => p.person_id);
}

export function eventSpan(s: TripState, e: TripEvent): Span {
  return spanOf(s.trip, e.duration, { date: e.start_date, part: e.start_part });
}

/** Nuits couvertes par une activité multi-jours à laquelle la personne participe. */
export function includedNights(s: TripState, personId: string): Set<string> {
  const out = new Set<string>();
  for (const e of s.events) {
    if (participantsOf(s, e.id).includes(personId)) for (const n of eventSpan(s, e).nights) out.add(n);
  }
  return out;
}

/** Activité multi-jours de l'équipe qui couvre cette nuit (nuit « À bord » / « Incluse »). */
export function teamIncludedNight(s: TripState, teamId: string, night: string): TripEvent | undefined {
  return s.events.find(e => e.team_id === teamId && eventSpan(s, e).nights.includes(night));
}

export function stayFor(s: TripState, personId: string, night: string): Stay | undefined {
  const teamIds = effectiveTeamIds(s, personId, slotIndex(s.trip, night, 'soir'));
  return s.stays.find(st => st.night_date === night && teamIds.includes(st.team_id));
}

export function computeAlerts(s: TripState): Alert[] {
  const alerts: Alert[] = [];
  const nights = nightDates(s.trip);
  for (const person of s.people) {
    const evs = s.events
      .filter(e => participantsOf(s, e.id).includes(person.id))
      .map(e => ({ e, slots: new Set(eventSpan(s, e).slots) }));
    for (let i = 0; i < evs.length; i++) {
      for (let j = i + 1; j < evs.length; j++) {
        if ([...evs[i].slots].some(x => evs[j].slots.has(x))) {
          alerts.push({ kind: 'overlap', personId: person.id, eventIds: [evs[i].e.id, evs[j].e.id] });
        }
      }
    }
    const teams = s.teams.filter(t => !t.is_default && membersOf(s, t.id).includes(person.id));
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const [a1, b1] = teamRange(s, teams[i]);
        const [a2, b2] = teamRange(s, teams[j]);
        if (a1 <= b2 && a2 <= b1) alerts.push({ kind: 'two-teams', personId: person.id, teamIds: [teams[i].id, teams[j].id] });
      }
    }
    const included = includedNights(s, person.id);
    for (const night of nights) {
      if (!included.has(night) && !stayFor(s, person.id, night)) alerts.push({ kind: 'no-stay', personId: person.id, night });
    }
  }
  return alerts;
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/conflicts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): alertes de chevauchement et nuits sans logement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Dépenses (`expenses.ts`)

**Files:**
- Create: `src/domain/expenses.ts`
- Test: `src/domain/expenses.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { expensesByPerson, shareOf } from './expenses';
import { makeEvent, makeState, makeStay, participants } from '../test/fixtures';

describe('shareOf', () => {
  it('répartit un total ou garde un prix par personne', () => {
    expect(shareOf(null, 'total', 3)).toBe(0);
    expect(shareOf(300, 'total', 3)).toBe(100);
    expect(shareOf(45, 'per_person', 3)).toBe(45);
    expect(shareOf(300, 'total', 0)).toBe(0);
  });
});

describe('expensesByPerson', () => {
  it('somme logements, bateau et activités et compare au budget', () => {
    const base = makeState();
    const s = makeState({
      people: base.people.map(p => (p.id === 'p4' ? { ...p, budget_max: null } : p)),
      events: [
        makeEvent({ id: 'b', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', price: 2400, price_mode: 'total' }),
        makeEvent({ id: 's', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin', price: 45, price_mode: 'per_person' }),
      ],
      event_participants: [...participants('b', ['p1', 'p2', 'p3', 'p4']), ...participants('s', ['p1'])],
      stays: [makeStay({ id: 'st', night_date: '2027-04-15', price: 1000, price_mode: 'total' })],
    });
    const rows = expensesByPerson(s);
    expect(rows.find(r => r.personId === 'p1')).toEqual({
      personId: 'p1', lodging: 250, boat: 600, activities: 45, total: 895, budget: 1000, delta: 105,
    });
    expect(rows.find(r => r.personId === 'p4')).toMatchObject({ total: 850, budget: null, delta: null });
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/expenses.test.ts`
Expected: FAIL — `Failed to resolve import "./expenses"`.

- [ ] **Step 3: Implémenter `src/domain/expenses.ts`**

```ts
import type { PriceMode, TripState } from './types';
import { participantsOf } from './conflicts';
import { rosterAt } from './teams';
import { slotIndex } from './slots';

export interface PersonExpense {
  personId: string; lodging: number; boat: number; activities: number; total: number;
  budget: number | null; delta: number | null;
}

export const BOAT_CATEGORY = 'Bateau';

export function shareOf(price: number | null, mode: PriceMode, n: number): number {
  if (!price || n <= 0) return 0;
  return mode === 'total' ? price / n : price;
}

const round = (x: number) => Math.round(x * 100) / 100;

export function expensesByPerson(s: TripState): PersonExpense[] {
  const acc = new Map(s.people.map(p => [p.id, { lodging: 0, boat: 0, activities: 0 }]));
  for (const e of s.events) {
    const ps = participantsOf(s, e.id);
    const amount = shareOf(e.price, e.price_mode, ps.length);
    const isBoat = s.activities.find(a => a.id === e.activity_id)?.category === BOAT_CATEGORY;
    for (const p of ps) {
      const row = acc.get(p);
      if (row) isBoat ? (row.boat += amount) : (row.activities += amount);
    }
  }
  for (const st of s.stays) {
    const ps = rosterAt(s, st.team_id, slotIndex(s.trip, st.night_date, 'soir'));
    const amount = shareOf(st.price, st.price_mode, ps.length);
    for (const p of ps) {
      const row = acc.get(p);
      if (row) row.lodging += amount;
    }
  }
  return s.people.map(p => {
    const r = acc.get(p.id)!;
    const total = round(r.lodging + r.boat + r.activities);
    return {
      personId: p.id, lodging: round(r.lodging), boat: round(r.boat), activities: round(r.activities), total,
      budget: p.budget_max, delta: p.budget_max == null ? null : round(p.budget_max - total),
    };
  });
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/expenses.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): calcul des dépenses par personne

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Validation (`validation.ts`)

**Files:**
- Create: `src/domain/validation.ts`
- Test: `src/domain/validation.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { isValidUrl, parseLatLng, parsePrice } from './validation';

describe('validation', () => {
  it('URL http/https uniquement', () => {
    expect(isValidUrl('https://exemple.com/bateau')).toBe(true);
    expect(isValidUrl('http://a.fr')).toBe(true);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('pas une url')).toBe(false);
  });

  it('coordonnées GPS', () => {
    expect(parseLatLng('14.6161, -61.0588')).toEqual({ lat: 14.6161, lng: -61.0588 });
    expect(parseLatLng(' 14.6 -61 ')).toEqual({ lat: 14.6, lng: -61 });
    expect(parseLatLng('95, 10')).toBeNull();
    expect(parseLatLng('abc')).toBeNull();
  });

  it('prix', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('45,5')).toBe(45.5);
    expect(parsePrice('1200')).toBe(1200);
    expect(parsePrice('-3')).toBe('invalid');
    expect(parsePrice('abc')).toBe('invalid');
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: FAIL — `Failed to resolve import "./validation"`.

- [ ] **Step 3: Implémenter `src/domain/validation.ts`**

```ts
export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseLatLng(s: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** '' → null (pas de prix) ; montant ≥ 0 → nombre ; sinon 'invalid'. */
export function parsePrice(s: string): number | null | 'invalid' {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): validation URL, GPS et prix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Itinéraire (`itinerary.ts`)

**Files:**
- Create: `src/domain/itinerary.ts`
- Test: `src/domain/itinerary.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { itinerary, routePoints } from './itinerary';
import { makeEvent, makeState, makeStay, makeTeam, members, participants } from '../test/fixtures';

const bt = makeTeam({ id: 'bt', color: '#123456', start_date: '2027-04-17', start_part: 'matin', end_date: '2027-04-20', end_part: 'soir' });
const s = makeState({
  teams: [...makeState().teams, bt],
  team_members: members('bt', ['p3']),
  events: [
    makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin', lat: 14.5, lng: -61, place_name: 'Tartane' }),
    makeEvent({ id: 'e2', team_id: 'bt', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', lat: 14.4, lng: -60.9 }),
  ],
  event_participants: [...participants('e1', ['p1', 'p2']), ...participants('e2', ['p3'])],
  stays: [makeStay({ id: 'st1', night_date: '2027-04-16', lat: 14.6, lng: -61.1, place_name: 'Gîte Trinité' })],
});

describe('itinerary', () => {
  it('liste activités et logement par jour', () => {
    const day16 = itinerary(s, null)[1];
    expect(day16.date).toBe('2027-04-16');
    expect(day16.entries).toHaveLength(1);
    expect(day16.entries[0].events.map(e => e.id)).toEqual(['e1']);
    expect(day16.entries[0].stay?.id).toBe('st1');
  });

  it("n'affiche que les équipes ayant quelque chose ce jour-là", () => {
    const day17 = itinerary(s, null)[2];
    expect(day17.entries.map(e => e.team.id)).toEqual(['bt']);
    expect(day17.entries[0].includedBy?.id).toBe('e2');
  });

  it('filtre « Mon parcours »', () => {
    expect(itinerary(s, 'p1')[1].entries[0].events.map(e => e.id)).toEqual(['e1']);
    const p4 = itinerary(s, 'p4')[1].entries[0];
    expect(p4.events).toEqual([]);
    expect(p4.stay?.id).toBe('st1');
  });

  it('produit les points de carte chronologiques sans doublon', () => {
    const pts = routePoints(s, null);
    expect(pts.map(p => p.id)).toEqual(['e1', 'st1', 'e2']);
    expect(pts[0]).toMatchObject({ label: 'Tartane', color: '#0e9aa7' });
    expect(pts[2]).toMatchObject({ label: 'Bateau multi-jours', color: '#123456' });
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npx vitest run src/domain/itinerary.test.ts`
Expected: FAIL — `Failed to resolve import "./itinerary"`.

- [ ] **Step 3: Implémenter `src/domain/itinerary.ts`**

```ts
import type { Stay, Team, TripEvent, TripState } from './types';
import { PARTS, nightDates, slotIndex, tripDates } from './slots';
import { rosterAt, teamsOnDay } from './teams';
import { eventSpan, participantsOf, teamIncludedNight } from './conflicts';

export interface DayEntry {
  team: Team; roster: string[]; events: TripEvent[]; stay: Stay | undefined; includedBy: TripEvent | undefined;
}
export interface DayPlan { date: string; entries: DayEntry[] }
export interface RoutePoint { id: string; lat: number; lng: number; label: string; color: string; teamId: string }

export function itinerary(s: TripState, personId: string | null): DayPlan[] {
  const nights = new Set(nightDates(s.trip));
  return tripDates(s.trip).map(date => {
    const dayIdx = PARTS.map(p => slotIndex(s.trip, date, p));
    const entries = teamsOnDay(s, date)
      .map((team): DayEntry => {
        const roster = [...new Set(dayIdx.flatMap(i => rosterAt(s, team.id, i)))];
        const events = s.events
          .filter(e => e.team_id === team.id && eventSpan(s, e).slots.some(i => dayIdx.includes(i)))
          .filter(e => !personId || participantsOf(s, e.id).includes(personId))
          .sort((a, b) => slotIndex(s.trip, a.start_date, a.start_part) - slotIndex(s.trip, b.start_date, b.start_part));
        let stay: Stay | undefined;
        let includedBy: TripEvent | undefined;
        if (nights.has(date)) {
          const nightRoster = rosterAt(s, team.id, dayIdx[2]);
          if (!personId || nightRoster.includes(personId)) {
            stay = s.stays.find(st => st.team_id === team.id && st.night_date === date);
          }
          const inc = teamIncludedNight(s, team.id, date);
          if (inc && (!personId || participantsOf(s, inc.id).includes(personId))) includedBy = inc;
        }
        return { team, roster, events, stay, includedBy };
      })
      .filter(en => en.events.length > 0 || en.stay || en.includedBy);
    return { date, entries };
  });
}

export function routePoints(s: TripState, personId: string | null): RoutePoint[] {
  const seen = new Set<string>();
  const out: RoutePoint[] = [];
  const activityName = (e: TripEvent) => s.activities.find(a => a.id === e.activity_id)?.name ?? 'Activité';
  for (const day of itinerary(s, personId)) {
    for (const en of day.entries) {
      for (const e of en.events) {
        if (e.lat == null || e.lng == null || seen.has(e.id)) continue;
        seen.add(e.id);
        out.push({ id: e.id, lat: e.lat, lng: e.lng, label: e.place_name || activityName(e), color: en.team.color, teamId: en.team.id });
      }
      const st = en.stay;
      if (st && st.lat != null && st.lng != null && !seen.has(st.id)) {
        seen.add(st.id);
        out.push({ id: st.id, lat: st.lat, lng: st.lng, label: st.place_name || 'Logement', color: en.team.color, teamId: en.team.id });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npx vitest run src/domain/itinerary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Lancer toute la suite**

Run: `npm test`
Expected: tous les tests du domaine PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(domain): itinéraire jour par jour et points de carte

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Schéma SQL, RPC et seed

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rpc.sql`, `supabase/seed.sql`

- [ ] **Step 1: Créer `supabase/migrations/0001_schema.sql`**

```sql
create table trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_date date not null,
  end_date date not null
);

create table people (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  budget_max numeric check (budget_max >= 0),
  sort int not null default 0
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  durations text[] not null check (cardinality(durations) > 0),
  has_quantity boolean not null default false,
  description text not null default '',
  links jsonb not null default '[]',
  is_custom boolean not null default false,
  created_by uuid references people on delete set null,
  created_at timestamptz not null default now()
);

create table wishes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  person_id uuid not null references people on delete cascade,
  activity_id uuid not null references activities on delete cascade,
  duration text not null,
  quantity int not null default 1 check (quantity between 1 and 10),
  unique (person_id, activity_id, duration)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  color text not null,
  start_date date not null,
  start_part text not null check (start_part in ('matin', 'aprem', 'soir')),
  end_date date not null,
  end_part text not null check (end_part in ('matin', 'aprem', 'soir')),
  is_default boolean not null default false
);

create table team_members (
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  person_id uuid not null references people on delete cascade,
  primary key (team_id, person_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  activity_id uuid not null references activities on delete restrict,
  duration text not null,
  occurrence int not null default 1,
  start_date date not null,
  start_part text not null check (start_part in ('matin', 'aprem', 'soir')),
  place_name text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  price numeric check (price >= 0),
  price_mode text not null default 'total' check (price_mode in ('total', 'per_person')),
  links jsonb not null default '[]',
  notes text not null default ''
);

create table event_participants (
  trip_id uuid not null references trips on delete cascade,
  event_id uuid not null references events on delete cascade,
  person_id uuid not null references people on delete cascade,
  primary key (event_id, person_id)
);

create table event_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  event_id uuid not null references events on delete cascade,
  author_id uuid not null references people on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  night_date date not null,
  place_name text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  price numeric check (price >= 0),
  price_mode text not null default 'total' check (price_mode in ('total', 'per_person')),
  links jsonb not null default '[]',
  notes text not null default '',
  unique (team_id, night_date)
);

-- Accès direct interdit : tout passe par les RPC security definer (0002_rpc.sql).
alter table trips enable row level security;
alter table people enable row level security;
alter table activities enable row level security;
alter table wishes enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table event_comments enable row level security;
alter table stays enable row level security;

revoke all on all tables in schema public from anon, authenticated;
```

- [ ] **Step 2: Créer `supabase/migrations/0002_rpc.sql`**

```sql
create or replace function trip_id_for(p_code text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from trips where code = p_code;
  if v is null then raise exception 'invalid_code'; end if;
  return v;
end $$;

create or replace function get_trip(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  return jsonb_build_object(
    'trip', (select to_jsonb(t) - 'code' from trips t where t.id = v),
    'people', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort) from people x where x.trip_id = v), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(to_jsonb(x) order by x.category, x.name) from activities x where x.trip_id = v), '[]'::jsonb),
    'wishes', coalesce((select jsonb_agg(to_jsonb(x)) from wishes x where x.trip_id = v), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(to_jsonb(x) order by x.is_default desc, x.start_date) from teams x where x.trip_id = v), '[]'::jsonb),
    'team_members', coalesce((select jsonb_agg(to_jsonb(x)) from team_members x where x.trip_id = v), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(x)) from events x where x.trip_id = v), '[]'::jsonb),
    'event_participants', coalesce((select jsonb_agg(to_jsonb(x)) from event_participants x where x.trip_id = v), '[]'::jsonb),
    'event_comments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from event_comments x where x.trip_id = v), '[]'::jsonb),
    'stays', coalesce((select jsonb_agg(to_jsonb(x)) from stays x where x.trip_id = v), '[]'::jsonb)
  );
end $$;

create or replace function set_budget(p_code text, p_person uuid, p_budget numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if p_budget is not null and p_budget < 0 then raise exception 'invalid_input'; end if;
  update people set budget_max = p_budget where id = p_person and trip_id = v;
end $$;

create or replace function upsert_wish(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from people where id = (p->>'person_id')::uuid and trip_id = v)
     or not exists (select 1 from activities where id = (p->>'activity_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into wishes (id, trip_id, person_id, activity_id, duration, quantity)
  values ((p->>'id')::uuid, v, (p->>'person_id')::uuid, (p->>'activity_id')::uuid, p->>'duration', coalesce((p->>'quantity')::int, 1))
  on conflict (person_id, activity_id, duration) do update set quantity = excluded.quantity;
end $$;

create or replace function delete_wish(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from wishes where id = p_id and trip_id = v;
end $$;

create or replace function upsert_activity(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  insert into activities (id, trip_id, name, category, durations, has_quantity, description, links, is_custom, created_by)
  values (
    (p->>'id')::uuid, v, trim(p->>'name'), trim(p->>'category'),
    array(select jsonb_array_elements_text(p->'durations')),
    coalesce((p->>'has_quantity')::boolean, false), coalesce(p->>'description', ''),
    coalesce(p->'links', '[]'::jsonb), true, (p->>'created_by')::uuid
  )
  on conflict (id) do update set
    name = excluded.name, category = excluded.category, durations = excluded.durations,
    has_quantity = excluded.has_quantity, description = excluded.description, links = excluded.links
  where activities.trip_id = v;
end $$;

create or replace function delete_activity(p_code text, p_id uuid, p_person uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if exists (select 1 from events where activity_id = p_id) then raise exception 'activity_in_use'; end if;
  delete from activities where id = p_id and trip_id = v and is_custom and created_by = p_person;
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function upsert_team(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if (p->>'end_date')::date < (p->>'start_date')::date then raise exception 'invalid_input'; end if;
  insert into teams (id, trip_id, name, color, start_date, start_part, end_date, end_part, is_default)
  values ((p->>'id')::uuid, v, p->>'name', p->>'color', (p->>'start_date')::date, p->>'start_part',
          (p->>'end_date')::date, p->>'end_part', false)
  on conflict (id) do update set
    name = excluded.name, color = excluded.color, start_date = excluded.start_date,
    start_part = excluded.start_part, end_date = excluded.end_date, end_part = excluded.end_part
  where teams.trip_id = v and not teams.is_default;
end $$;

create or replace function delete_team(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from teams where id = p_id and trip_id = v and not is_default;
end $$;

create or replace function set_team_members(p_code text, p_team uuid, p_people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = p_team and trip_id = v and not is_default) then
    raise exception 'forbidden';
  end if;
  delete from team_members where team_id = p_team;
  insert into team_members (trip_id, team_id, person_id)
  select v, p_team, x from unnest(p_people) x where x in (select id from people where trip_id = v);
end $$;

create or replace function upsert_event(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v)
     or not exists (select 1 from activities where id = (p->>'activity_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into events (id, trip_id, team_id, activity_id, duration, occurrence, start_date, start_part,
                      place_name, lat, lng, price, price_mode, links, notes)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'activity_id')::uuid, p->>'duration',
    coalesce((p->>'occurrence')::int, 1), (p->>'start_date')::date, p->>'start_part',
    coalesce(p->>'place_name', ''), (p->>'lat')::float8, (p->>'lng')::float8, (p->>'price')::numeric,
    coalesce(p->>'price_mode', 'total'), coalesce(p->'links', '[]'::jsonb), coalesce(p->>'notes', '')
  )
  on conflict (id) do update set
    team_id = excluded.team_id, start_date = excluded.start_date, start_part = excluded.start_part,
    place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    price_mode = excluded.price_mode, links = excluded.links, notes = excluded.notes
  where events.trip_id = v;
end $$;

create or replace function delete_event(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from events where id = p_id and trip_id = v;
end $$;

create or replace function set_event_participants(p_code text, p_event uuid, p_people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from events where id = p_event and trip_id = v) then raise exception 'forbidden'; end if;
  delete from event_participants where event_id = p_event;
  insert into event_participants (trip_id, event_id, person_id)
  select v, p_event, x from unnest(p_people) x where x in (select id from people where trip_id = v);
end $$;

create or replace function add_comment(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from events where id = (p->>'event_id')::uuid and trip_id = v)
     or not exists (select 1 from people where id = (p->>'author_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into event_comments (id, trip_id, event_id, author_id, body)
  values ((p->>'id')::uuid, v, (p->>'event_id')::uuid, (p->>'author_id')::uuid, p->>'body');
end $$;

create or replace function delete_comment(p_code text, p_id uuid, p_author uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from event_comments where id = p_id and trip_id = v and author_id = p_author;
end $$;

create or replace function upsert_stay(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into stays (id, trip_id, team_id, night_date, place_name, lat, lng, price, price_mode, links, notes)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'night_date')::date, coalesce(p->>'place_name', ''),
    (p->>'lat')::float8, (p->>'lng')::float8, (p->>'price')::numeric, coalesce(p->>'price_mode', 'total'),
    coalesce(p->'links', '[]'::jsonb), coalesce(p->>'notes', '')
  )
  on conflict (id) do update set
    place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    price_mode = excluded.price_mode, links = excluded.links, notes = excluded.notes
  where stays.trip_id = v;
end $$;

create or replace function delete_stay(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from stays where id = p_id and trip_id = v;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  get_trip(text), set_budget(text, uuid, numeric),
  upsert_wish(text, jsonb), delete_wish(text, uuid),
  upsert_activity(text, jsonb), delete_activity(text, uuid, uuid),
  upsert_team(text, jsonb), delete_team(text, uuid), set_team_members(text, uuid, uuid[]),
  upsert_event(text, jsonb), delete_event(text, uuid), set_event_participants(text, uuid, uuid[]),
  add_comment(text, jsonb), delete_comment(text, uuid, uuid),
  upsert_stay(text, jsonb), delete_stay(text, uuid)
to anon, authenticated;
```

- [ ] **Step 3: Créer `supabase/seed.sql`**

```sql
do $$
declare
  v_trip uuid;
  v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
begin
  insert into trips (code, name, start_date, end_date)
  values (v_code, 'Martinique 2027', '2027-04-15', '2027-04-25')
  returning id into v_trip;

  insert into people (trip_id, name, sort)
  select v_trip, n, ord::int from unnest(array[
    'Alexandre Martin', 'Baptiste Deschamps', 'Basile Boussemart', 'Inès De Passemar', 'Jarod Abelanet',
    'Jules Berson', 'Louise Paurise', 'Nicolas Leblanc', 'Theo Maraval', 'Victoire Gonin'
  ]) with ordinality as t(n, ord);

  insert into activities (trip_id, name, category, durations, has_quantity, is_custom) values
    (v_trip, 'Bateau multi-jours', 'Bateau', array['multi:4:3', 'multi:3:3', 'multi:3:2'], false, false),
    (v_trip, 'Escapade bateau', 'Bateau', array['half', 'day'], false, false),
    (v_trip, 'Pêche', 'Mer', array['half', 'day'], false, false),
    (v_trip, 'Surf', 'Mer', array['half', 'day'], false, false),
    (v_trip, 'Plage', 'Détente', array['half', 'day'], false, false),
    (v_trip, 'Pique-nique', 'Détente', array['half'], false, false),
    (v_trip, 'Coucher de soleil', 'Détente', array['evening'], false, false),
    (v_trip, 'Randonnée', 'Nature', array['half', 'day'], true, false),
    (v_trip, 'Cours de danse locale', 'Local', array['half', 'evening'], false, false),
    (v_trip, 'Cours de cuisine locale', 'Local', array['half'], false, false),
    (v_trip, 'Soirée locale', 'Local', array['evening'], false, false),
    (v_trip, 'Goûter un mafé', 'Local', array['evening', 'half'], false, false);

  insert into teams (trip_id, name, color, start_date, start_part, end_date, end_part, is_default)
  values (v_trip, 'Tout le groupe', '#0e9aa7', '2027-04-15', 'matin', '2027-04-25', 'soir', true);

  raise notice 'Code du voyage : %', v_code;
end $$;

select code from trips where name = 'Martinique 2027';
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): schéma, RPC sécurisées par code et seed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Création du projet Supabase et application des migrations

Exécuté via les outils MCP Supabase (`mcp__…supabase…`). **Demander confirmation à l'utilisateur avant toute création payante.**

- [ ] **Step 1:** `list_organizations` → retenir l'`id` de l'organisation (demander à l'utilisateur s'il y en a plusieurs).
- [ ] **Step 2:** `get_cost` (type `project`, organisation) → annoncer le coût à l'utilisateur, attendre son accord, puis `confirm_cost`.
- [ ] **Step 3:** `create_project` : nom `martinique-2027`, région `eu-west-3` (Paris), organisation retenue. Attendre le statut `ACTIVE_HEALTHY` avec `get_project`.
- [ ] **Step 4:** `apply_migration` nom `0001_schema` avec le contenu de `supabase/migrations/0001_schema.sql`, puis `apply_migration` nom `0002_rpc` avec `supabase/migrations/0002_rpc.sql`.
- [ ] **Step 5:** `execute_sql` avec le contenu de `supabase/seed.sql`. Noter le **code du voyage** renvoyé par le `select` final. Ne pas le committer.
- [ ] **Step 6:** Vérifier l'accès anonyme : `execute_sql` → `set role anon; select jsonb_array_length(get_trip('<code>')->'people'); reset role;` Expected: `10`. Puis `set role anon; select * from people; reset role;` Expected: erreur `permission denied`.
- [ ] **Step 7:** `get_advisors` (type `security`) : seuls des avertissements sur les fonctions `security definer` sont attendus (voulu). Corriger tout autre point.
- [ ] **Step 8:** `get_project_url` et `get_publishable_keys` → créer `.env.local` (ignoré par git) :

```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<clé publishable>
```

- [ ] **Step 9:** Vérifier dans le dashboard Supabase → Realtime → Settings que l'accès public aux canaux (« Allow public access ») est activé (valeur par défaut).

---

### Task 14: Couche données (client, API, identité, helpers)

**Files:**
- Create: `src/data/supabase.ts`, `src/data/api.ts`, `src/data/local.ts`, `src/identity/identity.ts`
- Test: `src/data/api.test.ts`, `src/data/local.test.ts`, `src/identity/identity.test.ts`

- [ ] **Step 1: Écrire les tests**

`src/data/local.test.ts` :
```ts
import { sameId, upsertBy } from './local';

describe('upsertBy', () => {
  it('ajoute ou remplace', () => {
    const list = [{ id: 'a', v: 1 }];
    expect(upsertBy(list, { id: 'b', v: 2 }, sameId)).toEqual([{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
    expect(upsertBy(list, { id: 'a', v: 3 }, sameId)).toEqual([{ id: 'a', v: 3 }]);
  });
});
```

`src/data/api.test.ts` :
```ts
import { errorMessage } from './api';

describe('errorMessage', () => {
  it('traduit les erreurs connues', () => {
    expect(errorMessage(new Error('activity_in_use'))).toMatch(/déjà dans le planning/);
    expect(errorMessage(new Error('forbidden'))).toBe('Action non autorisée.');
    expect(errorMessage(new Error('boom'))).toBe("La modification n'a pas pu être enregistrée.");
  });
});
```

`src/identity/identity.test.ts` :
```ts
import { loadIdentity, saveIdentity } from './identity';

describe('identity', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mémorise et oublie la personne par voyage', () => {
    saveIdentity('abc', 'p1');
    expect(loadIdentity('abc')).toBe('p1');
    expect(loadIdentity('autre')).toBeNull();
    saveIdentity('abc', null);
    expect(loadIdentity('abc')).toBeNull();
  });

  it('survit à un localStorage indisponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    expect(() => saveIdentity('abc', 'p1')).not.toThrow();
    expect(loadIdentity('abc')).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests (échec attendu)**

Run: `npx vitest run src/data src/identity`
Expected: FAIL — imports introuvables.

- [ ] **Step 3: Implémenter**

`src/data/supabase.ts` :
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
```

`src/data/api.ts` :
```ts
import { supabase } from './supabase';
import type { Activity, EventComment, Stay, Team, TripEvent, TripState, Wish } from '../domain/types';

export class InvalidCodeError extends Error {}

const MESSAGES: Record<string, string> = {
  activity_in_use: "Cette activité est déjà dans le planning : retire-la d'abord.",
  forbidden: 'Action non autorisée.',
  invalid_input: 'Valeurs invalides.',
};

export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  for (const k of Object.keys(MESSAGES)) if (msg.includes(k)) return MESSAGES[k];
  return "La modification n'a pas pu être enregistrée.";
}

export function makeApi(code: string) {
  async function call<T = void>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await supabase.rpc(fn, { p_code: code, ...args });
    if (error) {
      if (error.message.includes('invalid_code')) throw new InvalidCodeError(error.message);
      throw new Error(error.message);
    }
    return data as T;
  }
  return {
    getTrip: () => call<TripState>('get_trip'),
    setBudget: (personId: string, budget: number | null) => call('set_budget', { p_person: personId, p_budget: budget }),
    upsertWish: (w: Wish) => call('upsert_wish', { p: w }),
    deleteWish: (id: string) => call('delete_wish', { p_id: id }),
    upsertActivity: (a: Activity) => call('upsert_activity', { p: a }),
    deleteActivity: (id: string, personId: string) => call('delete_activity', { p_id: id, p_person: personId }),
    upsertTeam: (t: Team) => call('upsert_team', { p: t }),
    deleteTeam: (id: string) => call('delete_team', { p_id: id }),
    setTeamMembers: (teamId: string, ids: string[]) => call('set_team_members', { p_team: teamId, p_people: ids }),
    upsertEvent: (e: TripEvent) => call('upsert_event', { p: e }),
    deleteEvent: (id: string) => call('delete_event', { p_id: id }),
    setEventParticipants: (eventId: string, ids: string[]) => call('set_event_participants', { p_event: eventId, p_people: ids }),
    addComment: (c: EventComment) => call('add_comment', { p: c }),
    deleteComment: (id: string, authorId: string) => call('delete_comment', { p_id: id, p_author: authorId }),
    upsertStay: (st: Stay) => call('upsert_stay', { p: st }),
    deleteStay: (id: string) => call('delete_stay', { p_id: id }),
  };
}

export type Api = ReturnType<typeof makeApi>;
```

`src/data/local.ts` :
```ts
export function upsertBy<T>(list: T[], item: T, same: (a: T, b: T) => boolean): T[] {
  const i = list.findIndex(x => same(x, item));
  if (i < 0) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

export const sameId = <T extends { id: string }>(a: T, b: T) => a.id === b.id;
```

`src/identity/identity.ts` :
```ts
const key = (code: string) => `martinique:me:${code}`;

export function loadIdentity(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, personId: string | null): void {
  try {
    if (personId) localStorage.setItem(key(code), personId);
    else localStorage.removeItem(key(code));
  } catch {
    // localStorage indisponible : l'identité sera redemandée à la prochaine ouverture.
  }
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `npx vitest run src/data src/identity`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(data): client Supabase, API RPC et identité

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Contexte, provider temps réel, coquille de l'app

**Files:**
- Create: `src/data/TripContext.ts`, `src/data/TripProvider.tsx`, `src/test/renderWithTrip.tsx`, `src/identity/IdentityPicker.tsx`, `src/ui/BottomNav.tsx`, `src/ui/Feedback.tsx`, `src/App.tsx`, `src/styles.css`, placeholders `src/features/wishes/WishesTab.tsx`, `src/features/planning/PlanningTab.tsx`, `src/features/roadbook/RoadbookTab.tsx`
- Modify: `src/main.tsx`
- Test: `src/App.test.tsx`, `src/identity/IdentityPicker.test.tsx`

- [ ] **Step 1: Écrire les tests**

`src/App.test.tsx` :
```tsx
import { parseTripCode } from './App';

describe('parseTripCode', () => {
  it('extrait le code du hash', () => {
    expect(parseTripCode('#/t/abc123')).toBe('abc123');
    expect(parseTripCode('#/t/abc123/planning')).toBe('abc123');
    expect(parseTripCode('')).toBeNull();
    expect(parseTripCode('#/x')).toBeNull();
  });
});
```

`src/identity/IdentityPicker.test.tsx` :
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentityPicker } from './IdentityPicker';
import { makeState } from '../test/fixtures';

it('liste les voyageurs et renvoie le choix', async () => {
  const onPick = vi.fn();
  render(<IdentityPicker people={makeState().people} onPick={onPick} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
  await userEvent.click(screen.getByRole('button', { name: 'Jules' }));
  expect(onPick).toHaveBeenCalledWith('p2');
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/App.test.tsx src/identity`
Expected: FAIL — imports introuvables.

- [ ] **Step 3: Créer `src/data/TripContext.ts`**

```ts
import { createContext, useContext } from 'react';
import type { Activity, EventComment, Stay, Team, TripEvent, TripState, Wish } from '../domain/types';

export type Status = 'loading' | 'ready' | 'invalid' | 'error';
export interface Toast { id: string; text: string }

export interface TripActions {
  setBudget(personId: string, budget: number | null): Promise<void>;
  saveWish(w: Wish): Promise<void>;
  deleteWish(id: string): Promise<void>;
  saveActivity(a: Activity): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  saveTeam(t: Team, memberIds: string[]): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  saveEvent(e: TripEvent, participantIds?: string[]): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  addComment(c: EventComment): Promise<void>;
  deleteComment(id: string): Promise<void>;
  saveStay(st: Stay): Promise<void>;
  deleteStay(id: string): Promise<void>;
}

export interface TripCtx {
  status: Status;
  state: TripState | null;
  online: boolean;
  me: string | null;
  setMe(id: string | null): void;
  toasts: Toast[];
  dismissToast(id: string): void;
  actions: TripActions;
}

export const TripContext = createContext<TripCtx | null>(null);

export function useTrip(): TripCtx {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip hors de TripProvider');
  return ctx;
}

/** Pour les onglets : l'état est chargé et la personne identifiée. */
export function useReadyTrip(): TripCtx & { state: TripState; me: string } {
  const ctx = useTrip();
  if (!ctx.state || !ctx.me) throw new Error('Voyage non prêt');
  return { ...ctx, state: ctx.state, me: ctx.me };
}
```

- [ ] **Step 4: Créer `src/data/TripProvider.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InvalidCodeError, errorMessage, makeApi } from './api';
import { sameId, upsertBy } from './local';
import { TripContext, type Status, type Toast, type TripActions } from './TripContext';
import { loadIdentity, saveIdentity } from '../identity/identity';
import { newId } from '../lib/ids';
import type { TripState } from '../domain/types';

export function TripProvider({ code, children }: { code: string; children: ReactNode }) {
  const api = useMemo(() => makeApi(code), [code]);
  const [status, setStatus] = useState<Status>('loading');
  const [state, setState] = useState<TripState | null>(null);
  const [online, setOnline] = useState(true);
  const [me, setMeState] = useState<string | null>(() => loadIdentity(code));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wasOffline = useRef(false);
  const meRef = useRef(me);
  meRef.current = me;

  const pushToast = useCallback((text: string) => {
    const id = newId();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const reload = useCallback(async () => {
    try {
      setState(await api.getTrip());
      setStatus('ready');
    } catch (e) {
      if (e instanceof InvalidCodeError) setStatus('invalid');
      else {
        setStatus(s => (s === 'ready' ? 'ready' : 'error'));
        pushToast('Impossible de charger le voyage.');
      }
    }
  }, [api, pushToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase.channel(`trip-${code}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'changed' }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => void reload(), 300);
    }).subscribe(s => {
      if (s === 'SUBSCRIBED') {
        setOnline(true);
        if (wasOffline.current) void reload();
        wasOffline.current = false;
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        setOnline(false);
        wasOffline.current = true;
      }
    });
    channelRef.current = ch;
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [code, reload]);

  const mutate = useCallback(
    async (local: (s: TripState) => TripState, remote: () => Promise<unknown>) => {
      setState(s => (s ? local(s) : s));
      try {
        await remote();
        void channelRef.current?.send({ type: 'broadcast', event: 'changed', payload: {} });
      } catch (e) {
        pushToast(errorMessage(e));
        await reload();
      }
    },
    [pushToast, reload],
  );

  const actions = useMemo<TripActions>(() => ({
    setBudget: (personId, budget) => mutate(
      s => ({ ...s, people: s.people.map(p => (p.id === personId ? { ...p, budget_max: budget } : p)) }),
      () => api.setBudget(personId, budget),
    ),
    saveWish: w => mutate(
      s => ({ ...s, wishes: upsertBy(s.wishes, w, (a, b) => a.person_id === b.person_id && a.activity_id === b.activity_id && a.duration === b.duration) }),
      () => api.upsertWish(w),
    ),
    deleteWish: id => mutate(s => ({ ...s, wishes: s.wishes.filter(w => w.id !== id) }), () => api.deleteWish(id)),
    saveActivity: a => mutate(s => ({ ...s, activities: upsertBy(s.activities, a, sameId) }), () => api.upsertActivity(a)),
    deleteActivity: id => mutate(
      s => ({ ...s, activities: s.activities.filter(a => a.id !== id), wishes: s.wishes.filter(w => w.activity_id !== id) }),
      () => api.deleteActivity(id, meRef.current ?? ''),
    ),
    saveTeam: (t, memberIds) => mutate(
      s => ({
        ...s,
        teams: upsertBy(s.teams, t, sameId),
        team_members: [
          ...s.team_members.filter(m => m.team_id !== t.id),
          ...memberIds.map(person_id => ({ trip_id: t.trip_id, team_id: t.id, person_id })),
        ],
      }),
      async () => {
        await api.upsertTeam(t);
        await api.setTeamMembers(t.id, memberIds);
      },
    ),
    deleteTeam: id => mutate(s => {
      const ev = new Set(s.events.filter(e => e.team_id === id).map(e => e.id));
      return {
        ...s,
        teams: s.teams.filter(t => t.id !== id),
        team_members: s.team_members.filter(m => m.team_id !== id),
        events: s.events.filter(e => !ev.has(e.id)),
        event_participants: s.event_participants.filter(p => !ev.has(p.event_id)),
        event_comments: s.event_comments.filter(c => !ev.has(c.event_id)),
        stays: s.stays.filter(st => st.team_id !== id),
      };
    }, () => api.deleteTeam(id)),
    saveEvent: (e, participantIds) => mutate(
      s => ({
        ...s,
        events: upsertBy(s.events, e, sameId),
        event_participants: participantIds
          ? [...s.event_participants.filter(p => p.event_id !== e.id), ...participantIds.map(person_id => ({ trip_id: e.trip_id, event_id: e.id, person_id }))]
          : s.event_participants,
      }),
      async () => {
        await api.upsertEvent(e);
        if (participantIds) await api.setEventParticipants(e.id, participantIds);
      },
    ),
    deleteEvent: id => mutate(
      s => ({
        ...s,
        events: s.events.filter(e => e.id !== id),
        event_participants: s.event_participants.filter(p => p.event_id !== id),
        event_comments: s.event_comments.filter(c => c.event_id !== id),
      }),
      () => api.deleteEvent(id),
    ),
    addComment: c => mutate(s => ({ ...s, event_comments: [...s.event_comments, c] }), () => api.addComment(c)),
    deleteComment: id => mutate(
      s => ({ ...s, event_comments: s.event_comments.filter(c => c.id !== id) }),
      () => api.deleteComment(id, meRef.current ?? ''),
    ),
    saveStay: st => mutate(s => ({ ...s, stays: upsertBy(s.stays, st, sameId) }), () => api.upsertStay(st)),
    deleteStay: id => mutate(s => ({ ...s, stays: s.stays.filter(st => st.id !== id) }), () => api.deleteStay(id)),
  }), [api, mutate]);

  const setMe = useCallback((id: string | null) => {
    saveIdentity(code, id);
    setMeState(id);
  }, [code]);

  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  return (
    <TripContext.Provider value={{ status, state, online, me, setMe, toasts, dismissToast, actions }}>
      {children}
    </TripContext.Provider>
  );
}
```

- [ ] **Step 5: Créer `src/test/renderWithTrip.tsx`**

```tsx
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { TripContext, type TripActions, type TripCtx } from '../data/TripContext';
import type { TripState } from '../domain/types';
import { makeState } from './fixtures';

export function fakeActions(): TripActions {
  const fn = () => vi.fn().mockResolvedValue(undefined);
  return {
    setBudget: fn(), saveWish: fn(), deleteWish: fn(), saveActivity: fn(), deleteActivity: fn(),
    saveTeam: fn(), deleteTeam: fn(), saveEvent: fn(), deleteEvent: fn(), addComment: fn(),
    deleteComment: fn(), saveStay: fn(), deleteStay: fn(),
  };
}

export function renderWithTrip(
  ui: ReactElement,
  { state = makeState(), me = 'p1', actions = fakeActions() }: { state?: TripState; me?: string; actions?: TripActions } = {},
) {
  const value: TripCtx = {
    status: 'ready', state, online: true, me, setMe: vi.fn(), toasts: [], dismissToast: vi.fn(), actions,
  };
  return { ...render(<TripContext.Provider value={value}>{ui}</TripContext.Provider>), actions };
}
```

- [ ] **Step 6: Créer `src/identity/IdentityPicker.tsx`**

```tsx
import type { Person } from '../domain/types';

export function IdentityPicker({ people, onPick }: { people: Person[]; onPick: (id: string) => void }) {
  return (
    <main className="identity">
      <h1>🌴 Martinique 2027</h1>
      <p>Qui es-tu ?</p>
      <ul>
        {people.map(p => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)}>{p.name.split(' ')[0]}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Note : le test cherche `'Jules'` — le bouton affiche le prénom.

- [ ] **Step 7: Créer `src/ui/BottomNav.tsx` et `src/ui/Feedback.tsx`**

`src/ui/BottomNav.tsx` :
```tsx
export type Tab = 'envies' | 'planning' | 'roadbook';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'envies', label: 'Envies', icon: '🌴' },
  { id: 'planning', label: 'Planning', icon: '🗓️' },
  { id: 'roadbook', label: 'Road-book', icon: '🗺️' },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <span aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/ui/Feedback.tsx` :
```tsx
import { useTrip } from '../data/TripContext';

export function OfflineBanner() {
  return <div className="offline" role="status">Hors ligne — reconnexion…</div>;
}

export function Toasts() {
  const { toasts, dismissToast } = useTrip();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>{t.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Créer les onglets provisoires (remplacés en Tasks 17, 18 et 21)**

`src/features/wishes/WishesTab.tsx` :
```tsx
export function WishesTab() {
  return <p>Envies</p>;
}
```
`src/features/planning/PlanningTab.tsx` :
```tsx
export function PlanningTab() {
  return <p>Planning</p>;
}
```
`src/features/roadbook/RoadbookTab.tsx` :
```tsx
export function RoadbookTab() {
  return <p>Road-book</p>;
}
```

- [ ] **Step 9: Créer `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { TripProvider } from './data/TripProvider';
import { useTrip } from './data/TripContext';
import { IdentityPicker } from './identity/IdentityPicker';
import { BottomNav, type Tab } from './ui/BottomNav';
import { OfflineBanner, Toasts } from './ui/Feedback';
import { WishesTab } from './features/wishes/WishesTab';
import { PlanningTab } from './features/planning/PlanningTab';
import { RoadbookTab } from './features/roadbook/RoadbookTab';

export function parseTripCode(hash: string): string | null {
  const m = /^#\/t\/([A-Za-z0-9]+)/.exec(hash);
  return m ? m[1] : null;
}

function InvalidLink() {
  return (
    <main className="center-page">
      <h1>Lien invalide</h1>
      <p>Demande le lien du voyage au groupe.</p>
    </main>
  );
}

function Shell() {
  const { status, state, me, setMe, online } = useTrip();
  const [tab, setTab] = useState<Tab>('envies');
  if (status === 'invalid') return <InvalidLink />;
  if (!state) {
    return (
      <main className="center-page">
        <p>{status === 'error' ? 'Impossible de charger le voyage. Vérifie ta connexion.' : 'Chargement…'}</p>
      </main>
    );
  }
  const person = state.people.find(p => p.id === me);
  if (!person) return <IdentityPicker people={state.people} onPick={setMe} />;
  return (
    <div className="app">
      <header className="app-header">
        <h1>🌴 {state.trip.name}</h1>
        <button className="link-btn" onClick={() => setMe(null)}>{person.name.split(' ')[0]} · changer</button>
      </header>
      {!online && <OfflineBanner />}
      <main className="app-main">
        {tab === 'envies' && <WishesTab />}
        {tab === 'planning' && <PlanningTab />}
        {tab === 'roadbook' && <RoadbookTab />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
      <Toasts />
    </div>
  );
}

export function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const code = parseTripCode(hash);
  if (!code) return <InvalidLink />;
  return (
    <TripProvider key={code} code={code}>
      <Shell />
    </TripProvider>
  );
}
```

- [ ] **Step 10: Remplacer `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 11: Créer `src/styles.css`**

```css
:root {
  --sea: #0e9aa7; --sea-dark: #0b7480; --sea-light: #e0f4f5; --coral: #ff6f59; --coral-light: #fff3ef;
  --sand: #fdf8f0; --ink: #1f2d3a; --muted: #6b7a88; --card: #fff; --line: #e6dfd3;
  --warn: #f59e0b; --warn-light: #fff7e6; --ok: #16a34a; --over: #dc2626; --radius: 12px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--ink);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--sand); }
button { font: inherit; cursor: pointer; border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 6px 10px; color: inherit; }
button.primary { background: var(--sea); color: #fff; border-color: var(--sea); }
button.danger { color: var(--over); border-color: var(--over); }
button:disabled { opacity: .5; cursor: not-allowed; }
input, select, textarea { font: inherit; padding: 8px; border: 1px solid var(--line); border-radius: 8px; width: 100%; background: #fff; color: inherit; }
h2 { font-size: 1.1rem; }
.row { display: flex; gap: 8px; align-items: center; }
.row > input, .row > textarea, .row > select { flex: 1; }
.muted { color: var(--muted); font-size: .9em; }
.error { color: var(--over); font-size: .9em; margin: 4px 0; }
.card { background: var(--card); border-radius: var(--radius); padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 12px; }
.center-page { min-height: 100vh; display: grid; place-content: center; text-align: center; padding: 16px; }
.app { min-height: 100vh; padding-bottom: 72px; }
.app-header { position: sticky; top: 0; z-index: 500; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--sea); color: #fff; }
.app-header h1 { font-size: 1.1rem; margin: 0; }
.link-btn { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.5); }
.app-main { padding: 16px; max-width: 1400px; margin: 0 auto; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 600; display: flex; background: #fff; border-top: 1px solid var(--line); }
.bottom-nav button { flex: 1; border: 0; border-radius: 0; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: .8rem; color: var(--muted); }
.bottom-nav button.active { color: var(--sea); font-weight: 600; }
.offline { background: var(--warn); color: #000; text-align: center; padding: 6px; }
.toasts { position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%); z-index: 3000; display: grid; gap: 8px; width: min(92vw, 420px); }
.toast { background: var(--ink); color: #fff; padding: 10px 14px; border-radius: 8px; }
.identity { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
.identity ul { list-style: none; padding: 0; display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
.identity button { width: 100%; padding: 14px; font-size: 1.05rem; }
.info-banner { background: var(--sea-light); border-left: 4px solid var(--sea); padding: 10px 12px; border-radius: 8px; }
.cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.activity-card header { display: flex; justify-content: space-between; align-items: start; }
.activity-card h3 { margin: 0 0 6px; font-size: 1rem; }
.durations { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 8px; }
.check { display: flex; align-items: center; gap: 8px; }
.check input { width: auto; }
.qty select { width: auto; margin-left: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.chip { background: var(--sea-light); color: var(--sea-dark); border-radius: 999px; padding: 2px 8px; font-size: .8rem; }
.icon-btn { border: 0; background: transparent; padding: 2px 6px; font-size: 1rem; }
.wide { width: 100%; padding: 12px; }
.field { display: grid; gap: 6px; margin: 12px 0; }
.field-label { font-weight: 600; font-size: .9rem; }
.link-list { list-style: none; padding: 0; margin: 4px 0; display: flex; flex-wrap: wrap; gap: 8px; }
.link-list a { color: var(--sea-dark); }
.links-editor ul { list-style: none; padding: 0; margin: 0 0 6px; }
.links-editor li { display: flex; justify-content: space-between; align-items: center; }
.links-editor .row { flex-wrap: wrap; }
/* Planning */
.planning { display: grid; gap: 12px; padding-bottom: 45vh; }
.teams-bar { display: flex; flex-wrap: wrap; gap: 8px; }
.team-chip { color: #fff; border: 0; }
.team-chip.add { color: var(--sea-dark); background: #fff; border: 1px dashed var(--sea); }
.alerts { background: var(--warn-light); border: 1px solid var(--warn); border-radius: 8px; padding: 8px; }
.alerts > button { border: 0; background: transparent; font-weight: 600; width: 100%; text-align: left; }
.alerts ul { margin: 6px 0 0; padding-left: 18px; }
.day-chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; }
.day-chips button { white-space: nowrap; text-transform: capitalize; }
.grid { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; }
.day { flex: 0 0 min(86vw, 300px); scroll-snap-align: start; display: grid; gap: 8px; align-content: start; }
.day-title { margin: 0; font-size: 1rem; text-transform: capitalize; }
.team-block { border: 2px solid; border-radius: var(--radius); background: #fff; overflow: hidden; }
.team-label { color: #fff; font-size: .8rem; font-weight: 600; padding: 4px 8px; }
.slot { min-height: 64px; padding: 6px 8px; border-top: 1px solid var(--line); display: grid; gap: 4px; position: relative; align-content: start; }
.slot.disabled { background: repeating-linear-gradient(45deg, #f6f3ee, #f6f3ee 6px, #efebe4 6px, #efebe4 12px); }
.slot.over { background: var(--sea-light); outline: 2px dashed var(--sea); }
.slot-label { font-size: .7rem; text-transform: uppercase; color: var(--muted); letter-spacing: .04em; }
.add-btn { position: absolute; top: 4px; right: 6px; padding: 0 8px; border-radius: 999px; }
.tile { text-align: left; display: grid; gap: 2px; background: var(--coral-light); border: 1px solid var(--coral); border-left: 4px solid var(--coral); touch-action: manipulation; }
.tile.cont { opacity: .75; border-style: dashed; }
.tile.warn { background: var(--warn-light); border-color: var(--warn); }
.tile.dragging { opacity: .4; }
.tile-meta { font-size: .8rem; color: var(--muted); }
.tile-icons { display: flex; gap: 8px; font-size: .8rem; }
.night { width: 100%; border: 0; border-top: 1px solid var(--line); border-radius: 0; text-align: left; background: #f1f5fb; padding: 8px; font-size: .85rem; }
.night.empty { color: var(--muted); }
.night.warn { background: var(--warn-light); }
.night.included { background: #e8f1ff; }
.night.disabled { min-height: 8px; padding: 0; }
.unplaced { position: fixed; left: 0; right: 0; bottom: 56px; z-index: 550; background: #fff; border-top: 2px solid var(--coral); max-height: 45vh; overflow-y: auto; padding: 8px 12px; box-shadow: 0 -4px 12px rgba(0,0,0,.08); }
.unplaced-toggle { width: 100%; font-weight: 700; border: 0; text-align: left; background: transparent; }
.unplaced ul { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 6px; }
.unplaced-item { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 8px; border: 1px solid var(--line); border-radius: 8px; background: #fff; cursor: grab; touch-action: none; user-select: none; }
.unplaced-item.hot { background: var(--coral-light); border-color: var(--coral); box-shadow: 0 0 0 2px rgba(255,111,89,.25); }
.unplaced-item .badge { grid-row: span 2; align-self: center; background: var(--muted); color: #fff; border-radius: 999px; padding: 2px 10px; font-size: .8rem; font-weight: 600; }
.unplaced-item.hot .badge { background: var(--coral); }
.unplaced-item .names { grid-column: 1 / -1; font-size: .8rem; color: var(--muted); }
.unplaced-item.dragging { opacity: .4; }
@media (min-width: 900px) {
  .planning { grid-template-columns: 1fr 300px; padding-bottom: 0; }
  .planning > :not(.unplaced) { grid-column: 1; }
  .planning > .unplaced { position: sticky; top: 64px; grid-column: 2; grid-row: 1 / span 4; max-height: calc(100vh - 140px); border: 1px solid var(--line); border-top: 2px solid var(--coral); border-radius: var(--radius); box-shadow: none; align-self: start; }
}
/* Fiches */
.sheet-backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(15,23,32,.45); display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: #fff; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; border-radius: 16px 16px 0 0; padding: 0 16px 16px; }
@media (min-width: 700px) { .sheet-backdrop { align-items: center; } .sheet { border-radius: 16px; } }
.sheet-header { position: sticky; top: 0; background: #fff; display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); z-index: 1000; }
.sheet-header h2 { margin: 0; font-size: 1.05rem; }
.sheet-actions { display: flex; justify-content: space-between; gap: 8px; margin: 16px 0; }
.people-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.people-picker button[aria-pressed="true"] { background: var(--sea); color: #fff; border-color: var(--sea); }
.map { height: 220px; border-radius: 8px; z-index: 0; }
.map-route { height: 360px; }
.search-results { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.search-results button { width: 100%; text-align: left; font-size: .85rem; }
.comments ul { list-style: none; padding: 0; display: grid; gap: 8px; }
.comment-head { display: flex; gap: 8px; align-items: center; }
.comments p { margin: 2px 0 0; white-space: pre-wrap; }
.pick-list { list-style: none; padding: 0; display: grid; gap: 6px; }
.pick-list button { width: 100%; text-align: left; }
/* Road-book */
.roadbook { display: grid; gap: 12px; }
.toggle { display: flex; gap: 8px; align-items: center; font-weight: 600; }
.toggle input { width: auto; }
.table-scroll { overflow-x: auto; }
table.expenses { width: 100%; border-collapse: collapse; font-size: .9rem; }
.expenses th, .expenses td { padding: 6px 8px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
.expenses th:first-child, .expenses td:first-child { text-align: left; }
.expenses tr.me { background: var(--sea-light); }
.expenses .ok { color: var(--ok); font-weight: 600; }
.expenses .over { color: var(--over); font-weight: 600; }
.recap-day h3 { margin-top: 0; text-transform: capitalize; }
.recap-team { border-left: 4px solid; padding-left: 10px; margin: 10px 0; }
.recap-team h4 { margin: 0 0 4px; }
.recap-team ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
```

- [ ] **Step 12: Lancer tests et build**

Run: `npm test && npm run build`
Expected: tous les tests PASS ; build OK.

- [ ] **Step 13: Vérification manuelle**

Run (en arrière-plan) : `npm run dev`, ouvrir `http://localhost:5173/martinique-2027/#/t/<code>` → écran « Qui es-tu ? » avec 10 prénoms ; choisir un prénom → en-tête + 3 onglets provisoires. `http://localhost:5173/martinique-2027/#/t/faux` → « Lien invalide ».

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: coquille de l'app, provider temps réel et identité

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Composants UI partagés

**Files:**
- Create: `src/ui/Sheet.tsx`, `src/ui/Field.tsx`, `src/ui/Links.tsx`, `src/ui/PeoplePicker.tsx`, `src/ui/PriceField.tsx`, `src/ui/MapPicker.tsx`, `src/ui/PlaceField.tsx`, `src/lib/geocode.ts`
- Test: `src/ui/Links.test.tsx`, `src/ui/PriceField.test.tsx`

- [ ] **Step 1: Écrire les tests**

`src/ui/Links.test.tsx` :
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinksEditor } from './Links';

describe('LinksEditor', () => {
  it('refuse une URL invalide', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('URL du lien'), 'pas-un-lien');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Lien invalide');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ajoute un lien avec libellé', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('URL du lien'), 'https://catamaran.mq');
    await userEvent.type(screen.getByLabelText('Libellé du lien'), 'Loueur');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onChange).toHaveBeenCalledWith([{ url: 'https://catamaran.mq', label: 'Loueur' }]);
  });

  it('retire un lien', async () => {
    const onChange = vi.fn();
    render(<LinksEditor links={[{ url: 'https://a.fr', label: 'A' }]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retirer A' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

`src/ui/PriceField.test.tsx` :
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceField } from './PriceField';

it('émet le prix et affiche la part par personne', async () => {
  const onChange = vi.fn();
  render(<PriceField price={null} mode="total" onChange={onChange} participants={4} />);
  await userEvent.type(screen.getByLabelText('Montant (€)'), '2400');
  expect(onChange).toHaveBeenLastCalledWith(2400, 'total');
  expect(screen.getByText(/600/)).toBeInTheDocument();
});

it('signale un montant invalide', async () => {
  const onValidity = vi.fn();
  render(<PriceField price={null} mode="total" onChange={vi.fn()} onValidity={onValidity} />);
  await userEvent.type(screen.getByLabelText('Montant (€)'), 'abc');
  expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
  expect(onValidity).toHaveBeenLastCalledWith(false);
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/ui`
Expected: FAIL — imports introuvables.

- [ ] **Step 3: Implémenter**

`src/ui/Sheet.tsx` :
```tsx
import { useEffect, type ReactNode } from 'react';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>×</button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
```

`src/ui/Field.tsx` :
```tsx
import type { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}
```

`src/ui/Links.tsx` :
```tsx
import { useState } from 'react';
import type { Link } from '../domain/types';
import { isValidUrl } from '../domain/validation';

export function LinkList({ links }: { links: Link[] }) {
  if (!links.length) return null;
  return (
    <ul className="link-list">
      {links.map((l, i) => (
        <li key={i}><a href={l.url} target="_blank" rel="noreferrer noopener">🔗 {l.label}</a></li>
      ))}
    </ul>
  );
}

export function LinksEditor({ links, onChange }: { links: Link[]; onChange: (links: Link[]) => void }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const add = () => {
    const u = url.trim();
    if (!isValidUrl(u)) {
      setError('Lien invalide (doit commencer par http:// ou https://)');
      return;
    }
    onChange([...links, { url: u, label: label.trim() || new URL(u).hostname }]);
    setUrl('');
    setLabel('');
    setError('');
  };
  return (
    <div className="links-editor">
      <ul>
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.url} target="_blank" rel="noreferrer noopener">🔗 {l.label}</a>
            <button type="button" className="icon-btn" aria-label={`Retirer ${l.label}`} onClick={() => onChange(links.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input aria-label="URL du lien" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
        <input aria-label="Libellé du lien" placeholder="Libellé (optionnel)" value={label} onChange={e => setLabel(e.target.value)} />
        <button type="button" onClick={add}>Ajouter</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
```

`src/ui/PeoplePicker.tsx` :
```tsx
import type { Person } from '../domain/types';
import { firstName } from '../lib/format';

export function PeoplePicker({ people, selected, onChange }: { people: Person[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <div className="people-picker">
      {people.map(p => (
        <button key={p.id} type="button" aria-pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
          {firstName(p.name)}
        </button>
      ))}
    </div>
  );
}
```

`src/ui/PriceField.tsx` :
```tsx
import { useEffect, useState } from 'react';
import type { PriceMode } from '../domain/types';
import { parsePrice } from '../domain/validation';
import { formatEuros } from '../lib/format';

interface Props {
  price: number | null;
  mode: PriceMode;
  onChange: (price: number | null, mode: PriceMode) => void;
  onValidity?: (ok: boolean) => void;
  participants?: number;
}

export function PriceField({ price, mode, onChange, onValidity, participants }: Props) {
  const [text, setText] = useState(price == null ? '' : String(price));
  const parsed = parsePrice(text);
  useEffect(() => { onValidity?.(parsed !== 'invalid'); }, [parsed, onValidity]);
  return (
    <div className="price-field">
      <div className="row">
        <input
          aria-label="Montant (€)" inputMode="decimal" placeholder="Montant €" value={text}
          onChange={e => {
            setText(e.target.value);
            const p = parsePrice(e.target.value);
            if (p !== 'invalid') onChange(p, mode);
          }}
        />
        <select aria-label="Mode de prix" value={mode} onChange={e => onChange(parsed === 'invalid' ? price : parsed, e.target.value as PriceMode)}>
          <option value="total">au total</option>
          <option value="per_person">par personne</option>
        </select>
      </div>
      {parsed === 'invalid' && <p className="error" role="alert">Montant invalide</p>}
      {typeof parsed === 'number' && mode === 'total' && participants ? (
        <p className="muted">≈ {formatEuros(parsed / participants)} / pers. ({participants} pers.)</p>
      ) : null}
    </div>
  );
}
```

`src/lib/geocode.ts` :
```ts
export interface SearchResult { id: string; label: string; lat: number; lng: number }

export async function searchPlaces(q: string): Promise<SearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=mq&accept-language=fr&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode');
  const data = (await res.json()) as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;
  return data.map(d => ({ id: String(d.place_id), label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}
```

`src/ui/MapPicker.tsx` :
```tsx
import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export const MARTINIQUE_CENTER: [number, number] = [14.64, -61.02];
export const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [lat, lng, map]);
  return null;
}

export function MapPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const pos: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;
  return (
    <MapContainer center={pos ?? MARTINIQUE_CENTER} zoom={pos ? 12 : 10} className="map">
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
      <ClickHandler onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {pos && <CircleMarker center={pos} radius={9} pathOptions={{ color: '#ff6f59', fillOpacity: 0.8 }} />}
    </MapContainer>
  );
}
```

`src/ui/PlaceField.tsx` :
```tsx
import { useState } from 'react';
import { parseLatLng } from '../domain/validation';
import { searchPlaces, type SearchResult } from '../lib/geocode';
import { MapPicker } from './MapPicker';

export interface PlaceValue { place_name: string; lat: number | null; lng: number | null }

export function PlaceField({ value, onChange }: { value: PlaceValue; onChange: (v: PlaceValue) => void }) {
  const [coords, setCoords] = useState(value.lat != null && value.lng != null ? `${value.lat}, ${value.lng}` : '');
  const [coordErr, setCoordErr] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const setPoint = (lat: number, lng: number, name = value.place_name) => {
    onChange({ place_name: name, lat, lng });
    setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCoordErr('');
  };
  const applyCoords = () => {
    if (!coords.trim()) return onChange({ ...value, lat: null, lng: null });
    const p = parseLatLng(coords);
    if (!p) setCoordErr('Coordonnées invalides (ex. 14.6161, -61.0588)');
    else setPoint(p.lat, p.lng);
  };
  const search = async () => {
    setSearching(true);
    setSearchErr('');
    try {
      const r = await searchPlaces(query);
      setResults(r);
      if (!r.length) setSearchErr('Aucun résultat');
    } catch {
      setSearchErr('Recherche indisponible');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="place-field">
      <input aria-label="Nom du lieu" placeholder="Nom du lieu" value={value.place_name} onChange={e => onChange({ ...value, place_name: e.target.value })} />
      <div className="row">
        <input
          aria-label="Rechercher une adresse" placeholder="Rechercher une adresse…" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
        />
        <button type="button" onClick={() => void search()} disabled={searching || !query.trim()}>{searching ? '…' : 'Chercher'}</button>
      </div>
      {searchErr && <p className="muted">{searchErr}</p>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map(r => (
            <li key={r.id}>
              <button type="button" onClick={() => { setPoint(r.lat, r.lng, value.place_name || r.label.split(',')[0]); setResults([]); }}>{r.label}</button>
            </li>
          ))}
        </ul>
      )}
      <MapPicker lat={value.lat} lng={value.lng} onPick={(lat, lng) => setPoint(lat, lng)} />
      <input aria-label="Coordonnées GPS" placeholder="lat, lng (ex. 14.6161, -61.0588)" value={coords} onChange={e => setCoords(e.target.value)} onBlur={applyCoords} />
      {coordErr && <p className="error" role="alert">{coordErr}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `npx vitest run src/ui && npx tsc`
Expected: PASS (5 tests), tsc sans erreur.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): fiches, liens, participants, prix, carte et lieu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Onglet Envies

**Files:**
- Create: `src/features/wishes/ProfileCard.tsx`, `src/features/wishes/ActivityCard.tsx`, `src/features/wishes/AddActivityForm.tsx`
- Modify: `src/features/wishes/WishesTab.tsx` (remplacement complet)
- Test: `src/features/wishes/ActivityCard.test.tsx`, `src/features/wishes/AddActivityForm.test.tsx`

- [ ] **Step 1: Écrire les tests**

`src/features/wishes/ActivityCard.test.tsx` :
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityCard } from './ActivityCard';
import { makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const base = makeState();
const surf = base.activities.find(a => a.id === 'surf')!;
const rando = base.activities.find(a => a.id === 'rando')!;

describe('ActivityCard', () => {
  it('coche une envie', async () => {
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />);
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ person_id: 'p1', activity_id: 'surf', duration: 'half', quantity: 1 }));
  });

  it('décoche une envie', async () => {
    const state = makeState({ wishes: [{ id: 'w1', trip_id: 'trip', person_id: 'p1', activity_id: 'surf', duration: 'half', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={surf} />, { state });
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    expect(actions.deleteWish).toHaveBeenCalledWith('w1');
  });

  it('montre qui est intéressé et la quantité', () => {
    const state = makeState({ wishes: [{ id: 'w2', trip_id: 'trip', person_id: 'p2', activity_id: 'rando', duration: 'day', quantity: 3 }] });
    renderWithTrip(<ActivityCard activity={rando} />, { state });
    expect(screen.getByText('Jules ×3')).toBeInTheDocument();
  });

  it('choisit un nombre de randonnées', async () => {
    const state = makeState({ wishes: [{ id: 'w3', trip_id: 'trip', person_id: 'p1', activity_id: 'rando', duration: 'half', quantity: 1 }] });
    const { actions } = renderWithTrip(<ActivityCard activity={rando} />, { state });
    await userEvent.selectOptions(screen.getByLabelText('Combien ?'), '3');
    expect(actions.saveWish).toHaveBeenCalledWith(expect.objectContaining({ id: 'w3', quantity: 3 }));
  });
});
```

`src/features/wishes/AddActivityForm.test.tsx` :
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddActivityForm } from './AddActivityForm';
import { renderWithTrip } from '../../test/renderWithTrip';

describe('AddActivityForm', () => {
  it('exige un nom et une durée', async () => {
    const { actions } = renderWithTrip(<AddActivityForm onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(screen.getByRole('alert')).toHaveTextContent('Donne un nom');
    expect(actions.saveActivity).not.toHaveBeenCalled();
  });

  it('crée une activité personnalisée', async () => {
    const onDone = vi.fn();
    const { actions } = renderWithTrip(<AddActivityForm onDone={onDone} />);
    await userEvent.type(screen.getByLabelText("Nom de l'activité"), 'Plongée');
    await userEvent.click(screen.getByLabelText('Demi-journée'));
    await userEvent.click(screen.getByRole('button', { name: "Ajouter l'activité" }));
    expect(actions.saveActivity).toHaveBeenCalledWith(expect.objectContaining({ name: 'Plongée', durations: ['half'], is_custom: true, created_by: 'p1' }));
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/features/wishes`
Expected: FAIL — imports introuvables.

- [ ] **Step 3: Implémenter**

`src/features/wishes/ProfileCard.tsx` :
```tsx
import { useEffect, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { parsePrice } from '../../domain/validation';

export function ProfileCard() {
  const { state, me, actions } = useReadyTrip();
  const person = state.people.find(p => p.id === me)!;
  const [text, setText] = useState(person.budget_max == null ? '' : String(person.budget_max));
  const [error, setError] = useState('');
  useEffect(() => setText(person.budget_max == null ? '' : String(person.budget_max)), [person.budget_max]);
  const commit = () => {
    const p = parsePrice(text);
    if (p === 'invalid') return setError('Montant invalide');
    setError('');
    if (p !== person.budget_max) void actions.setBudget(person.id, p);
  };
  return (
    <section className="card profile">
      <h2>Mon profil — {person.name}</h2>
      <label className="field">
        <span className="field-label">Mon budget max (€)</span>
        <input inputMode="decimal" placeholder="ex. 1500" value={text} onChange={e => setText(e.target.value)} onBlur={commit} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">
        Ce budget couvre <strong>logements + bateau + grosses activités payantes</strong>. Il ne comprend pas les
        restaurants ni les sorties gratuites (randonnées, plages, pique-niques…).
      </p>
    </section>
  );
}
```

`src/features/wishes/ActivityCard.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import type { Activity } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { firstName } from '../../lib/format';
import { newId } from '../../lib/ids';
import { LinkList } from '../../ui/Links';

export function ActivityCard({ activity }: { activity: Activity }) {
  const { state, me, actions } = useReadyTrip();
  const nameOf = (id: string) => firstName(state.people.find(p => p.id === id)?.name ?? '?');
  const canDelete = activity.is_custom && activity.created_by === me;
  return (
    <article className="card activity-card">
      <header>
        <h3>{activity.name}</h3>
        {canDelete && (
          <button
            className="icon-btn" aria-label={`Supprimer ${activity.name}`}
            onClick={() => { if (confirm(`Supprimer « ${activity.name} » du catalogue ?`)) void actions.deleteActivity(activity.id); }}
          >🗑️</button>
        )}
      </header>
      {activity.description && <p className="muted">{activity.description}</p>}
      <LinkList links={activity.links} />
      <ul className="durations">
        {activity.durations.map(d => {
          const mine = state.wishes.find(w => w.person_id === me && w.activity_id === activity.id && w.duration === d);
          const all = state.wishes.filter(w => w.activity_id === activity.id && w.duration === d);
          return (
            <li key={d}>
              <label className="check">
                <input
                  type="checkbox" checked={!!mine}
                  onChange={e => {
                    if (e.target.checked) {
                      void actions.saveWish({ id: newId(), trip_id: state.trip.id, person_id: me, activity_id: activity.id, duration: d, quantity: 1 });
                    } else if (mine) {
                      void actions.deleteWish(mine.id);
                    }
                  }}
                />
                {durationLabel(d)}
              </label>
              {activity.has_quantity && mine && (
                <label className="qty">
                  <span>Combien ?</span>
                  <select aria-label="Combien ?" value={mine.quantity} onChange={e => void actions.saveWish({ ...mine, quantity: Number(e.target.value) })}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              {all.length > 0 && (
                <div className="chips">
                  {all.map(w => (
                    <span key={w.id} className="chip">
                      {nameOf(w.person_id)}{activity.has_quantity && w.quantity > 1 ? ` ×${w.quantity}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
```

`src/features/wishes/AddActivityForm.tsx` :
```tsx
import { useState, type FormEvent } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Link } from '../../domain/types';
import { durationLabel, multiKey } from '../../domain/durations';
import { newId } from '../../lib/ids';
import { LinksEditor } from '../../ui/Links';
import { Field } from '../../ui/Field';

const BASE_DURATIONS = ['half', 'day', 'evening'];
const NEW_CATEGORY = '__new';

export function AddActivityForm({ onDone }: { onDone: () => void }) {
  const { state, me, actions } = useReadyTrip();
  const categories = [...new Set(state.activities.map(a => a.category))];
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState('');
  const [durations, setDurations] = useState<string[]>([]);
  const [days, setDays] = useState(2);
  const [nights, setNights] = useState(1);
  const [hasQuantity, setHasQuantity] = useState(false);
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const [error, setError] = useState('');

  const toggle = (k: string) => setDurations(d => (d.includes(k) ? d.filter(x => x !== k) : [...d, k]));
  const addMulti = () => {
    if (days < 1 || nights < 0 || nights > days) return setError('Multi-jours : nuits entre 0 et le nombre de jours');
    setError('');
    const k = multiKey(days, nights);
    if (!durations.includes(k)) setDurations([...durations, k]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cat = category === NEW_CATEGORY ? newCategory.trim() : category;
    if (!name.trim()) return setError("Donne un nom à l'activité");
    if (!cat) return setError('Choisis une catégorie');
    if (!durations.length) return setError('Choisis au moins une durée');
    void actions.saveActivity({
      id: newId(), trip_id: state.trip.id, name: name.trim(), category: cat, durations,
      has_quantity: hasQuantity, description: description.trim(), links, is_custom: true, created_by: me,
    });
    onDone();
  };

  return (
    <form className="card add-activity" onSubmit={submit}>
      <h2>Nouvelle activité</h2>
      <Field label="Nom">
        <input aria-label="Nom de l'activité" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Catégorie">
        <select aria-label="Catégorie" value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={NEW_CATEGORY}>Nouvelle catégorie…</option>
        </select>
        {category === NEW_CATEGORY && (
          <input aria-label="Nom de la nouvelle catégorie" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
        )}
      </Field>
      <Field label="Durées possibles">
        {BASE_DURATIONS.map(k => (
          <label key={k} className="check">
            <input type="checkbox" checked={durations.includes(k)} onChange={() => toggle(k)} />
            {durationLabel(k)}
          </label>
        ))}
        <div className="row">
          <input aria-label="Nombre de jours" type="number" min={1} max={10} value={days} onChange={e => setDays(Number(e.target.value))} />
          <span>jours</span>
          <input aria-label="Nombre de nuits" type="number" min={0} max={10} value={nights} onChange={e => setNights(Number(e.target.value))} />
          <span>nuits</span>
          <button type="button" onClick={addMulti}>+ Multi-jours</button>
        </div>
        {durations.filter(d => d.startsWith('multi:')).map(d => (
          <span key={d} className="chip">
            {durationLabel(d)}{' '}
            <button type="button" className="icon-btn" aria-label={`Retirer ${durationLabel(d)}`} onClick={() => toggle(d)}>×</button>
          </span>
        ))}
      </Field>
      <label className="check">
        <input type="checkbox" checked={hasQuantity} onChange={e => setHasQuantity(e.target.checked)} />
        On peut en vouloir plusieurs (ex. randonnées)
      </label>
      <Field label="Description">
        <textarea aria-label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={links} onChange={setLinks} />
      </Field>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" onClick={onDone}>Annuler</button>
        <button type="submit" className="primary">Ajouter l'activité</button>
      </div>
    </form>
  );
}
```

`src/features/wishes/WishesTab.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { ProfileCard } from './ProfileCard';
import { ActivityCard } from './ActivityCard';
import { AddActivityForm } from './AddActivityForm';

const CATEGORY_ORDER = ['Bateau', 'Mer', 'Détente', 'Nature', 'Local'];
const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);

export function WishesTab() {
  const { state } = useReadyTrip();
  const [adding, setAdding] = useState(false);
  const categories = [...new Set(state.activities.map(a => a.category))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'fr'));
  return (
    <div className="wishes">
      <ProfileCard />
      <p className="info-banner">
        Coche ce qui te tente et la durée. Selon les envies, <strong>on ne sera pas toujours tous ensemble</strong> :
        le planning prévoit des équipes en parallèle.
      </p>
      {categories.map(cat => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="cards">
            {state.activities.filter(a => a.category === cat).map(a => <ActivityCard key={a.id} activity={a} />)}
          </div>
        </section>
      ))}
      {adding ? (
        <AddActivityForm onDone={() => setAdding(false)} />
      ) : (
        <button className="primary wide" onClick={() => setAdding(true)}>+ Ajouter une activité</button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `npx vitest run src/features/wishes && npx tsc`
Expected: PASS (6 tests), tsc OK.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(envies): profil, budget, catalogue et ajout d'activité

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Planning — contexte, panneau « À placer » et grille

**Files:**
- Create: `src/features/planning/PlanningContext.ts`, `src/features/planning/UnplacedPanel.tsx`, `src/features/planning/PlanningGrid.tsx`, `src/features/planning/DayColumn.tsx`, `src/features/planning/SlotCell.tsx`, `src/features/planning/EventTile.tsx`, `src/features/planning/NightCell.tsx`, `src/features/planning/TeamsBar.tsx`, `src/features/planning/AlertsBar.tsx`
- Modify: `src/features/planning/PlanningTab.tsx` (remplacement complet)
- Test: `src/features/planning/UnplacedPanel.test.tsx`

- [ ] **Step 1: Écrire le test**

```tsx
import { screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { UnplacedPanel } from './UnplacedPanel';
import { makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';
import type { Wish } from '../../domain/types';

const w = (id: string, person_id: string, activity_id: string, duration: string, quantity = 1): Wish =>
  ({ id, trip_id: 'trip', person_id, activity_id, duration, quantity });

it('met en avant les activités non placées les plus suggérées', () => {
  const state = makeState({
    wishes: [w('1', 'p1', 'surf', 'half'), w('2', 'p2', 'surf', 'half'), w('3', 'p3', 'surf', 'half'), w('4', 'p1', 'rando', 'half', 2)],
  });
  renderWithTrip(<DndContext><UnplacedPanel /></DndContext>, { state });
  expect(screen.getByText('À placer (3)', { exact: false })).toBeInTheDocument();
  const hot = screen.getByText('Suggérée par 3').closest('li')!;
  expect(hot).toHaveClass('hot');
  expect(hot).toHaveTextContent('Théo, Jules, Inès');
  expect(screen.getByText('Randonnée n°2')).toBeInTheDocument();
  expect(screen.getAllByText('Suggérée par 1')[0].closest('li')).not.toHaveClass('hot');
});

it('indique quand tout est placé', () => {
  renderWithTrip(<DndContext><UnplacedPanel /></DndContext>);
  expect(screen.getByText('Toutes les envies sont placées.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/features/planning`
Expected: FAIL — import introuvable.

- [ ] **Step 3: Créer `src/features/planning/PlanningContext.ts`**

```ts
import { createContext, useContext } from 'react';
import type { Alert } from '../../domain/conflicts';
import type { UnplacedItem } from '../../domain/unplaced';

export type SheetState =
  | { kind: 'event'; id: string }
  | { kind: 'stay'; teamId: string; night: string }
  | { kind: 'team'; id: string | null }
  | { kind: 'quick'; teamId: string; idx: number }
  | { kind: 'place'; item: UnplacedItem }
  | null;

export interface PlanningCtx {
  openSheet(s: SheetState): void;
  place(item: UnplacedItem, teamId: string, idx: number): void;
  alerts: Alert[];
}

export const PlanningContext = createContext<PlanningCtx>({ openSheet: () => {}, place: () => {}, alerts: [] });
export const usePlanning = () => useContext(PlanningContext);

export type DragData = { type: 'wish'; item: UnplacedItem } | { type: 'event'; eventId: string };
export type DropData = { teamId: string; idx: number };
```

- [ ] **Step 4: Créer `src/features/planning/UnplacedPanel.tsx`**

```tsx
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
  const items = useMemo(() => unplacedItems(state), [state]);
  const [open, setOpen] = useState(true);
  return (
    <aside className="unplaced" aria-label="Activités à placer">
      <button className="unplaced-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        À placer ({items.length}) {open ? '▾' : '▴'}
      </button>
      {open && (items.length === 0 ? (
        <p className="muted">Toutes les envies sont placées.</p>
      ) : (
        <>
          <p className="muted">Glisse une activité dans le planning, ou touche-la pour choisir le créneau.</p>
          <ul>{items.map(it => <UnplacedChip key={it.key} item={it} />)}</ul>
        </>
      ))}
    </aside>
  );
}
```

- [ ] **Step 5: Lancer le test (succès attendu)**

Run: `npx vitest run src/features/planning`
Expected: PASS (2 tests).

- [ ] **Step 6: Créer les composants de grille**

`src/features/planning/EventTile.tsx` :
```tsx
import { useDraggable } from '@dnd-kit/core';
import { useReadyTrip } from '../../data/TripContext';
import type { TripEvent } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { eventSpan, participantsOf } from '../../domain/conflicts';
import { usePlanning, type DragData } from './PlanningContext';

export function EventTile({ event, idx }: { event: TripEvent; idx: number }) {
  const { state } = useReadyTrip();
  const { openSheet, alerts } = usePlanning();
  const activity = state.activities.find(a => a.id === event.activity_id);
  const isStart = eventSpan(state, event).slots[0] === idx;
  const data: DragData = { type: 'event', eventId: event.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `event|${event.id}|${idx}`, data, disabled: !isStart });
  const count = participantsOf(state, event.id).length;
  const comments = state.event_comments.filter(c => c.event_id === event.id).length;
  const warn = alerts.some(a => a.kind === 'overlap' && a.eventIds.includes(event.id));
  return (
    <button
      ref={setNodeRef} {...listeners} {...attributes} type="button"
      className={`tile ${isStart ? '' : 'cont'} ${warn ? 'warn' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => openSheet({ kind: 'event', id: event.id })}
    >
      <strong>{activity?.name ?? 'Activité'}{!isStart && <span className="muted"> (suite)</span>}</strong>
      <span className="tile-meta">
        {durationLabel(event.duration)} · {count} pers.{event.place_name ? ` · ${event.place_name}` : ''}
      </span>
      {(event.links.length > 0 || comments > 0) && (
        <span className="tile-icons">
          {event.links.length > 0 && <span aria-label={`${event.links.length} lien(s)`}>🔗 {event.links.length}</span>}
          {comments > 0 && <span aria-label={`${comments} commentaire(s)`}>💬 {comments}</span>}
        </span>
      )}
    </button>
  );
}
```

`src/features/planning/SlotCell.tsx` :
```tsx
import { useDroppable } from '@dnd-kit/core';
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { PART_LABEL, buildSlots } from '../../domain/slots';
import { teamCovers } from '../../domain/teams';
import { eventSpan } from '../../domain/conflicts';
import { usePlanning, type DropData } from './PlanningContext';
import { EventTile } from './EventTile';

export function SlotCell({ team, idx }: { team: Team; idx: number }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const slot = buildSlots(state.trip)[idx];
  const enabled = slot.plannable && teamCovers(state, team, idx);
  const data: DropData = { teamId: team.id, idx };
  const { setNodeRef, isOver } = useDroppable({ id: `cell|${team.id}|${idx}`, data, disabled: !enabled });
  const events = state.events.filter(e => e.team_id === team.id && eventSpan(state, e).slots.includes(idx));
  return (
    <div ref={setNodeRef} className={`slot ${enabled ? '' : 'disabled'} ${isOver ? 'over' : ''}`}>
      <span className="slot-label">{PART_LABEL[slot.part]}</span>
      {!slot.plannable && <span className="muted">{slot.blockedLabel}</span>}
      {events.map(e => <EventTile key={e.id} event={e} idx={idx} />)}
      {enabled && (
        <button className="add-btn" aria-label={`Ajouter une activité (${PART_LABEL[slot.part]})`} onClick={() => openSheet({ kind: 'quick', teamId: team.id, idx })}>+</button>
      )}
    </div>
  );
}
```

`src/features/planning/NightCell.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { slotIndex } from '../../domain/slots';
import { rosterAt, teamCovers } from '../../domain/teams';
import { teamIncludedNight } from '../../domain/conflicts';
import { BOAT_CATEGORY } from '../../domain/expenses';
import { formatEuros } from '../../lib/format';
import { usePlanning } from './PlanningContext';

export function NightCell({ team, night }: { team: Team; night: string }) {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  const idx = slotIndex(state.trip, night, 'soir');
  if (!teamCovers(state, team, idx)) return <div className="night disabled" />;
  const included = teamIncludedNight(state, team.id, night);
  if (included) {
    const a = state.activities.find(x => x.id === included.activity_id);
    return <div className="night included">🌙 {a?.category === BOAT_CATEGORY ? 'À bord' : `Inclus : ${a?.name ?? ''}`}</div>;
  }
  const stay = state.stays.find(st => st.team_id === team.id && st.night_date === night);
  const missing = !stay && rosterAt(state, team.id, idx).length > 0;
  const price = stay?.price != null ? ` · ${formatEuros(stay.price)}${stay.price_mode === 'per_person' ? '/pers.' : ''}` : '';
  return (
    <button type="button" className={`night ${stay ? '' : 'empty'} ${missing ? 'warn' : ''}`} onClick={() => openSheet({ kind: 'stay', teamId: team.id, night })}>
      🌙 {stay ? `${stay.place_name || 'Logement'}${price}` : '+ Logement'}
    </button>
  );
}
```

`src/features/planning/DayColumn.tsx` :
```tsx
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
    <div className="day" ref={columnRef}>
      <h3 className="day-title">{formatDay(date)}</h3>
      {teamsOnDay(state, date).map(team => {
        const roster = new Set(PARTS.flatMap(p => rosterAt(state, team.id, slotIndex(state.trip, date, p))));
        return (
          <div key={team.id} className="team-block" style={{ borderColor: team.color }}>
            <div className="team-label" style={{ background: team.color }}>{team.name} · {roster.size} pers.</div>
            {PARTS.map(part => <SlotCell key={part} team={team} idx={slotIndex(state.trip, date, part)} />)}
            {isNight && <NightCell team={team} night={date} />}
          </div>
        );
      })}
    </div>
  );
}
```

`src/features/planning/PlanningGrid.tsx` :
```tsx
import { useRef } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { tripDates } from '../../domain/slots';
import { formatDayShort } from '../../lib/format';
import { DayColumn } from './DayColumn';

export function PlanningGrid() {
  const { state } = useReadyTrip();
  const dates = tripDates(state.trip);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <section className="grid-wrap">
      <nav className="day-chips" aria-label="Aller au jour">
        {dates.map(d => (
          <button key={d} onClick={() => refs.current[d]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}>
            {formatDayShort(d)}
          </button>
        ))}
      </nav>
      <div className="grid">
        {dates.map(d => <DayColumn key={d} date={d} columnRef={el => { refs.current[d] = el; }} />)}
      </div>
    </section>
  );
}
```

`src/features/planning/TeamsBar.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import { membersOf } from '../../domain/teams';
import { usePlanning } from './PlanningContext';

export function TeamsBar() {
  const { state } = useReadyTrip();
  const { openSheet } = usePlanning();
  return (
    <div className="teams-bar">
      {state.teams.filter(t => !t.is_default).map(t => (
        <button key={t.id} className="team-chip" style={{ background: t.color }} onClick={() => openSheet({ kind: 'team', id: t.id })}>
          {t.name} · {membersOf(state, t.id).length} pers.
        </button>
      ))}
      <button className="team-chip add" onClick={() => openSheet({ kind: 'team', id: null })}>+ Équipe</button>
    </div>
  );
}
```

`src/features/planning/AlertsBar.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { firstName, formatDay } from '../../lib/format';
import { usePlanning } from './PlanningContext';

export function AlertsBar() {
  const { state } = useReadyTrip();
  const { alerts } = usePlanning();
  const [open, setOpen] = useState(false);
  if (!alerts.length) return null;
  const name = (id: string) => firstName(state.people.find(p => p.id === id)?.name ?? '?');
  const actName = (eventId: string) => {
    const e = state.events.find(x => x.id === eventId);
    return state.activities.find(a => a.id === e?.activity_id)?.name ?? '?';
  };
  const teamName = (id: string) => state.teams.find(t => t.id === id)?.name ?? '?';
  const conflicts = alerts.filter(a => a.kind !== 'no-stay');
  const noStay = new Map<string, string[]>();
  for (const a of alerts) if (a.kind === 'no-stay') noStay.set(a.night, [...(noStay.get(a.night) ?? []), a.personId]);
  return (
    <section className="alerts">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}>
        ⚠️ {conflicts.length} conflit(s) · {noStay.size} nuit(s) sans logement pour tout le monde {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {conflicts.map((a, i) => (
            <li key={i}>
              {a.kind === 'overlap' && `${name(a.personId)} : ${actName(a.eventIds[0])} et ${actName(a.eventIds[1])} se chevauchent`}
              {a.kind === 'two-teams' && `${name(a.personId)} est dans ${teamName(a.teamIds[0])} et ${teamName(a.teamIds[1])} en même temps`}
            </li>
          ))}
          {[...noStay].map(([night, ids]) => (
            <li key={night}>Nuit du {formatDay(night)} : {ids.length === state.people.length ? 'personne n’a de logement' : ids.map(name).join(', ')}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Remplacer `src/features/planning/PlanningTab.tsx`**

```tsx
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
    if (!canDrop(state, teamId, idx)) return;
    const { event, participantIds } = buildPlacedEvent(state, item, teamId, idx, newId());
    void actions.saveEvent(event, participantIds);
  }, [state, actions]);

  const move = (eventId: string, teamId: string, idx: number) => {
    const e = state.events.find(x => x.id === eventId);
    if (!e || !canDrop(state, teamId, idx)) return;
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
```

- [ ] **Step 8: Créer `src/features/planning/PlanningSheets.tsx` provisoire (complété en Task 19)**

```tsx
import type { SheetState } from './PlanningContext';

export function PlanningSheets({ sheet, onClose }: { sheet: NonNullable<SheetState>; onClose: () => void }) {
  void sheet;
  void onClose;
  return null;
}
```

- [ ] **Step 9: Tests + compilation**

Run: `npm test && npx tsc`
Expected: PASS, tsc OK.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(planning): grille, équipes, panneau à placer et glisser-déposer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Planning — fiches (activité, commentaires, logement, équipe, ajout, placement)

**Files:**
- Create: `src/features/planning/CommentsThread.tsx`, `src/features/planning/EventSheet.tsx`, `src/features/planning/StaySheet.tsx`, `src/features/planning/TeamSheet.tsx`, `src/features/planning/QuickAddSheet.tsx`, `src/features/planning/PlaceSheet.tsx`
- Modify: `src/features/planning/PlanningSheets.tsx` (remplacement complet)
- Test: `src/features/planning/CommentsThread.test.tsx`, `src/features/planning/TeamSheet.test.tsx`

- [ ] **Step 1: Écrire les tests**

`src/features/planning/CommentsThread.test.tsx` :
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentsThread } from './CommentsThread';
import { makeEvent, makeState } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';

const state = makeState({
  events: [makeEvent({ id: 'e1', activity_id: 'surf', duration: 'half', start_date: '2027-04-16', start_part: 'matin' })],
  event_comments: [
    { id: 'c1', trip_id: 'trip', event_id: 'e1', author_id: 'p2', body: 'Je réserve ?', created_at: '2026-10-01T10:00:00Z' },
    { id: 'c2', trip_id: 'trip', event_id: 'e1', author_id: 'p1', body: 'Oui !', created_at: '2026-10-01T11:00:00Z' },
  ],
});

describe('CommentsThread', () => {
  it('affiche les commentaires avec leur auteur', () => {
    renderWithTrip(<CommentsThread eventId="e1" />, { state });
    expect(screen.getByText('Jules')).toBeInTheDocument();
    expect(screen.getByText('Je réserve ?')).toBeInTheDocument();
  });

  it('ne permet de supprimer que ses propres commentaires', async () => {
    const { actions } = renderWithTrip(<CommentsThread eventId="e1" />, { state });
    const buttons = screen.getAllByRole('button', { name: 'Supprimer le commentaire' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);
    expect(actions.deleteComment).toHaveBeenCalledWith('c2');
  });

  it('envoie un commentaire', async () => {
    const { actions } = renderWithTrip(<CommentsThread eventId="e1" />, { state });
    await userEvent.type(screen.getByLabelText('Nouveau commentaire'), 'Super idée');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(actions.addComment).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'e1', author_id: 'p1', body: 'Super idée' }));
  });
});
```

`src/features/planning/TeamSheet.test.tsx` :
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSheet } from './TeamSheet';
import { renderWithTrip } from '../../test/renderWithTrip';

it('crée une équipe parallèle avec ses membres', async () => {
  const onClose = vi.fn();
  const { actions } = renderWithTrip(<TeamSheet teamId={null} onClose={onClose} />);
  await userEvent.clear(screen.getByLabelText("Nom de l'équipe"));
  await userEvent.type(screen.getByLabelText("Nom de l'équipe"), 'Bateau');
  await userEvent.click(screen.getByRole('button', { name: 'Théo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Inès' }));
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(actions.saveTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bateau', is_default: false }), ['p1', 'p3']);
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/features/planning`
Expected: FAIL — imports introuvables.

- [ ] **Step 3: Implémenter**

`src/features/planning/CommentsThread.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { firstName, formatDateTime } from '../../lib/format';
import { newId } from '../../lib/ids';

export function CommentsThread({ eventId }: { eventId: string }) {
  const { state, me, actions } = useReadyTrip();
  const [body, setBody] = useState('');
  const comments = state.event_comments
    .filter(c => c.event_id === eventId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const send = () => {
    const text = body.trim();
    if (!text) return;
    void actions.addComment({ id: newId(), trip_id: state.trip.id, event_id: eventId, author_id: me, body: text, created_at: new Date().toISOString() });
    setBody('');
  };
  return (
    <div className="comments">
      {comments.length === 0 && <p className="muted">Pas encore de commentaire.</p>}
      <ul>
        {comments.map(c => (
          <li key={c.id}>
            <div className="comment-head">
              <strong>{firstName(state.people.find(p => p.id === c.author_id)?.name ?? '?')}</strong>
              <span className="muted">{formatDateTime(c.created_at)}</span>
              {c.author_id === me && (
                <button className="icon-btn" aria-label="Supprimer le commentaire" onClick={() => void actions.deleteComment(c.id)}>×</button>
              )}
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
      <div className="row">
        <textarea aria-label="Nouveau commentaire" rows={2} maxLength={2000} placeholder="Écrire un commentaire…" value={body} onChange={e => setBody(e.target.value)} />
        <button type="button" onClick={send} disabled={!body.trim()}>Envoyer</button>
      </div>
    </div>
  );
}
```

`src/features/planning/EventSheet.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { durationLabel } from '../../domain/durations';
import { participantsOf } from '../../domain/conflicts';
import { PART_LABEL } from '../../domain/slots';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PeoplePicker } from '../../ui/PeoplePicker';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinksEditor } from '../../ui/Links';
import { CommentsThread } from './CommentsThread';

export function EventSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const event = state.events.find(e => e.id === eventId);
  const [draft, setDraft] = useState(event);
  const [people, setPeople] = useState(() => participantsOf(state, eventId));
  const [priceOk, setPriceOk] = useState(true);
  if (!event || !draft) return null;
  const activity = state.activities.find(a => a.id === event.activity_id);
  const team = state.teams.find(t => t.id === event.team_id);
  const save = () => {
    void actions.saveEvent(draft, people);
    onClose();
  };
  const remove = () => {
    if (!confirm('Retirer cette activité du planning ? Elle reviendra dans « À placer ».')) return;
    void actions.deleteEvent(event.id);
    onClose();
  };
  return (
    <Sheet title={`${activity?.name ?? 'Activité'} · ${durationLabel(event.duration)}`} onClose={onClose}>
      <p className="muted">{team?.name} · {formatDay(event.start_date)} · {PART_LABEL[event.start_part]}</p>
      <Field label={`Participants (${people.length})`}>
        <PeoplePicker people={state.people} selected={people} onChange={setPeople} />
      </Field>
      <Field label="Lieu">
        <PlaceField value={{ place_name: draft.place_name, lat: draft.lat, lng: draft.lng }} onChange={v => setDraft(d => d && { ...d, ...v })} />
      </Field>
      <Field label="Budget (optionnel)">
        <PriceField price={draft.price} mode={draft.price_mode} participants={people.length} onValidity={setPriceOk}
          onChange={(price, price_mode) => setDraft(d => d && { ...d, price, price_mode })} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={draft.links} onChange={links => setDraft(d => d && { ...d, links })} />
      </Field>
      <Field label="Notes">
        <textarea aria-label="Notes" rows={3} value={draft.notes} onChange={e => setDraft(d => d && { ...d, notes: e.target.value })} />
      </Field>
      <div className="sheet-actions">
        <button className="danger" onClick={remove}>Retirer</button>
        <button className="primary" disabled={!priceOk} onClick={save}>Enregistrer</button>
      </div>
      <Field label="Commentaires">
        <CommentsThread eventId={event.id} />
      </Field>
    </Sheet>
  );
}
```

`src/features/planning/StaySheet.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Stay } from '../../domain/types';
import { slotIndex } from '../../domain/slots';
import { rosterAt } from '../../domain/teams';
import { formatDay } from '../../lib/format';
import { newId } from '../../lib/ids';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PlaceField } from '../../ui/PlaceField';
import { PriceField } from '../../ui/PriceField';
import { LinksEditor } from '../../ui/Links';

export function StaySheet({ teamId, night, onClose }: { teamId: string; night: string; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const existing = state.stays.find(s => s.team_id === teamId && s.night_date === night);
  const [draft, setDraft] = useState<Stay>(() => existing ?? {
    id: newId(), trip_id: state.trip.id, team_id: teamId, night_date: night, place_name: '',
    lat: null, lng: null, price: null, price_mode: 'total', links: [], notes: '',
  });
  const [priceOk, setPriceOk] = useState(true);
  const team = state.teams.find(t => t.id === teamId);
  const roster = rosterAt(state, teamId, slotIndex(state.trip, night, 'soir'));
  return (
    <Sheet title={`Nuit du ${formatDay(night)}`} onClose={onClose}>
      <p className="muted">{team?.name} · {roster.length} pers.</p>
      <Field label="Ville / logement">
        <PlaceField value={{ place_name: draft.place_name, lat: draft.lat, lng: draft.lng }} onChange={v => setDraft(d => ({ ...d, ...v }))} />
      </Field>
      <Field label="Prix">
        <PriceField price={draft.price} mode={draft.price_mode} participants={roster.length} onValidity={setPriceOk}
          onChange={(price, price_mode) => setDraft(d => ({ ...d, price, price_mode }))} />
      </Field>
      <Field label="Liens">
        <LinksEditor links={draft.links} onChange={links => setDraft(d => ({ ...d, links }))} />
      </Field>
      <Field label="Notes">
        <textarea aria-label="Notes" rows={2} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </Field>
      <div className="sheet-actions">
        {existing ? <button className="danger" onClick={() => { void actions.deleteStay(existing.id); onClose(); }}>Supprimer</button> : <span />}
        <button className="primary" disabled={!priceOk} onClick={() => { void actions.saveStay(draft); onClose(); }}>Enregistrer</button>
      </div>
    </Sheet>
  );
}
```

`src/features/planning/TeamSheet.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { Team } from '../../domain/types';
import { PART_LABEL, buildSlots, slotAt, slotIndex } from '../../domain/slots';
import { membersOf } from '../../domain/teams';
import { formatDay } from '../../lib/format';
import { newId } from '../../lib/ids';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { PeoplePicker } from '../../ui/PeoplePicker';

export const TEAM_COLORS = ['#ff6f59', '#7c3aed', '#16a34a', '#d97706', '#db2777', '#2563eb'];

export function TeamSheet({ teamId, onClose }: { teamId: string | null; onClose: () => void }) {
  const { state, actions } = useReadyTrip();
  const existing = teamId ? state.teams.find(t => t.id === teamId) : undefined;
  const plannable = buildSlots(state.trip).filter(s => s.plannable);
  const [draft, setDraft] = useState<Team>(() => existing ?? {
    id: newId(), trip_id: state.trip.id, name: `Équipe ${state.teams.length + 1}`,
    color: TEAM_COLORS[(state.teams.length - 1) % TEAM_COLORS.length],
    start_date: plannable[0].date, start_part: plannable[0].part,
    end_date: plannable[plannable.length - 1].date, end_part: plannable[plannable.length - 1].part, is_default: false,
  });
  const [memberIds, setMemberIds] = useState<string[]>(() => (existing ? membersOf(state, existing.id) : []));
  const start = slotIndex(state.trip, draft.start_date, draft.start_part);
  const end = slotIndex(state.trip, draft.end_date, draft.end_part);
  const valid = draft.name.trim() !== '' && start <= end;
  const setBound = (which: 'start' | 'end', idx: number) => {
    const { date, part } = slotAt(state.trip, idx);
    setDraft(d => (which === 'start' ? { ...d, start_date: date, start_part: part } : { ...d, end_date: date, end_part: part }));
  };
  const remove = () => {
    if (!existing || !confirm('Supprimer cette équipe ? Ses activités et logements seront retirés du planning.')) return;
    void actions.deleteTeam(existing.id);
    onClose();
  };
  return (
    <Sheet title={existing ? existing.name : 'Nouvelle équipe'} onClose={onClose}>
      <p className="muted">Les membres d'une équipe font les mêmes activités sur toute sa période (ex. bateau 4 jours). Les autres restent dans « Tout le groupe ».</p>
      <Field label="Nom">
        <input aria-label="Nom de l'équipe" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
      </Field>
      <Field label="Couleur">
        <div className="row">
          {TEAM_COLORS.map(c => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={draft.color === c}
              style={{ background: c, width: 32, height: 32, outline: draft.color === c ? '3px solid #1f2d3a' : 'none' }}
              onClick={() => setDraft(d => ({ ...d, color: c }))} />
          ))}
        </div>
      </Field>
      <Field label="Du">
        <select aria-label="Début de l'équipe" value={start} onChange={e => setBound('start', Number(e.target.value))}>
          {plannable.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      <Field label="Au">
        <select aria-label="Fin de l'équipe" value={end} onChange={e => setBound('end', Number(e.target.value))}>
          {plannable.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      {start > end && <p className="error" role="alert">La fin doit être après le début.</p>}
      <Field label={`Membres (${memberIds.length})`}>
        <PeoplePicker people={state.people} selected={memberIds} onChange={setMemberIds} />
      </Field>
      <div className="sheet-actions">
        {existing ? <button className="danger" onClick={remove}>Supprimer</button> : <span />}
        <button className="primary" disabled={!valid} onClick={() => { void actions.saveTeam({ ...draft, name: draft.name.trim() }, memberIds); onClose(); }}>Enregistrer</button>
      </div>
    </Sheet>
  );
}
```

`src/features/planning/QuickAddSheet.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import type { Activity, DurationKey } from '../../domain/types';
import { durationLabel } from '../../domain/durations';
import { nextOccurrence } from '../../domain/placement';
import { PART_LABEL, slotAt } from '../../domain/slots';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { usePlanning } from './PlanningContext';

export function QuickAddSheet({ teamId, idx, onClose }: { teamId: string; idx: number; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { place } = usePlanning();
  const { date, part } = slotAt(state.trip, idx);
  const add = (activity: Activity, duration: DurationKey) => {
    place({ key: '', activity, duration, occurrence: nextOccurrence(state, activity.id, duration), personIds: [] }, teamId, idx);
    onClose();
  };
  return (
    <Sheet title={`Ajouter · ${formatDay(date)} ${PART_LABEL[part]}`} onClose={onClose}>
      <ul className="pick-list">
        {state.activities.flatMap(a => a.durations.map(d => (
          <li key={`${a.id}|${d}`}>
            <button onClick={() => add(a, d)}>{a.name} <span className="muted">· {durationLabel(d)}</span></button>
          </li>
        )))}
      </ul>
    </Sheet>
  );
}
```

`src/features/planning/PlaceSheet.tsx` :
```tsx
import { useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import type { UnplacedItem } from '../../domain/unplaced';
import { durationLabel } from '../../domain/durations';
import { PART_LABEL, buildSlots } from '../../domain/slots';
import { defaultTeam, teamCovers } from '../../domain/teams';
import { formatDay } from '../../lib/format';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Field';
import { usePlanning } from './PlanningContext';

export function PlaceSheet({ item, onClose }: { item: UnplacedItem; onClose: () => void }) {
  const { state } = useReadyTrip();
  const { place } = usePlanning();
  const optionsFor = (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId)!;
    return buildSlots(state.trip).filter(s => s.plannable && teamCovers(state, team, s.index));
  };
  const [teamId, setTeamId] = useState(defaultTeam(state).id);
  const [idx, setIdx] = useState(() => optionsFor(defaultTeam(state).id)[0]?.index ?? -1);
  const options = optionsFor(teamId);
  return (
    <Sheet title={`Placer · ${item.activity.name} (${durationLabel(item.duration)})`} onClose={onClose}>
      <Field label="Équipe">
        <select aria-label="Équipe" value={teamId} onChange={e => { setTeamId(e.target.value); setIdx(optionsFor(e.target.value)[0]?.index ?? -1); }}>
          {state.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Créneau de départ">
        <select aria-label="Créneau" value={idx} onChange={e => setIdx(Number(e.target.value))}>
          {options.map(s => <option key={s.index} value={s.index}>{formatDay(s.date)} · {PART_LABEL[s.part]}</option>)}
        </select>
      </Field>
      <div className="sheet-actions">
        <button onClick={onClose}>Annuler</button>
        <button className="primary" disabled={idx < 0} onClick={() => { place(item, teamId, idx); onClose(); }}>Placer</button>
      </div>
    </Sheet>
  );
}
```

`src/features/planning/PlanningSheets.tsx` (remplacement) :
```tsx
import type { SheetState } from './PlanningContext';
import { EventSheet } from './EventSheet';
import { StaySheet } from './StaySheet';
import { TeamSheet } from './TeamSheet';
import { QuickAddSheet } from './QuickAddSheet';
import { PlaceSheet } from './PlaceSheet';

export function PlanningSheets({ sheet, onClose }: { sheet: NonNullable<SheetState>; onClose: () => void }) {
  switch (sheet.kind) {
    case 'event': return <EventSheet eventId={sheet.id} onClose={onClose} />;
    case 'stay': return <StaySheet teamId={sheet.teamId} night={sheet.night} onClose={onClose} />;
    case 'team': return <TeamSheet teamId={sheet.id} onClose={onClose} />;
    case 'quick': return <QuickAddSheet teamId={sheet.teamId} idx={sheet.idx} onClose={onClose} />;
    case 'place': return <PlaceSheet item={sheet.item} onClose={onClose} />;
  }
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `npm test && npx tsc`
Expected: PASS (dont 4 nouveaux tests), tsc OK.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(planning): fiches activité, commentaires, logement, équipes et placement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Vérification manuelle du planning

- [ ] **Step 1:** `npm run dev` (arrière-plan), ouvrir `http://localhost:5173/martinique-2027/#/t/<code>` dans le navigateur intégré, se connecter en « Theo ».
- [ ] **Step 2:** Envies : cocher Surf demi-journée, Bateau 4j/3n, Randonnée ×2 ; saisir un budget 1500. Changer de personne → « Jules » → cocher Surf demi-journée.
- [ ] **Step 3:** Planning : le panneau affiche « Surf · Suggérée par 2 » en tête. Glisser Surf sur le 16 matin → tuile apparaît, panneau mis à jour. Toucher « Randonnée n°1 » → fiche Placer → placer.
- [ ] **Step 4:** « + Équipe » → Équipe bateau du 17 matin au 20 soir avec Theo → la colonne du 17 montre deux blocs. Glisser Bateau 4j/3n dans l'équipe bateau le 17 matin → tuiles sur 4 jours, nuits « À bord ».
- [ ] **Step 5:** Ouvrir la tuile Surf : ajouter un lieu par recherche « Tartane », un prix 45 par personne, un lien, un commentaire → Enregistrer → icônes 🔗 et 💬 sur la tuile.
- [ ] **Step 6:** Ouvrir un second onglet sur le même lien → une modification dans l'un apparaît dans l'autre en ~1 s.
- [ ] **Step 7:** Vue mobile (`resize_window` preset `mobile`) : panneau en bas, défilement horizontal des jours, appui long pour glisser. Remettre `desktop` ensuite.
- [ ] **Step 8:** Corriger tout défaut constaté (avec un test si c'est de la logique), puis commit `fix(planning): …`.

---

### Task 21: Onglet Road-book

**Files:**
- Create: `src/features/roadbook/ExpensesTable.tsx`, `src/features/roadbook/RouteMap.tsx`, `src/features/roadbook/DayRecap.tsx`
- Modify: `src/features/roadbook/RoadbookTab.tsx` (remplacement complet)
- Test: `src/features/roadbook/ExpensesTable.test.tsx`

- [ ] **Step 1: Écrire le test**

```tsx
import { screen, within } from '@testing-library/react';
import { ExpensesTable } from './ExpensesTable';
import { makeEvent, makeState, makeStay, participants } from '../../test/fixtures';
import { renderWithTrip } from '../../test/renderWithTrip';
import { formatEuros } from '../../lib/format';

it('résume les dépenses par personne et rappelle le périmètre', () => {
  const state = makeState({
    events: [makeEvent({ id: 'b', activity_id: 'boat', duration: 'multi:4:3', start_date: '2027-04-17', start_part: 'matin', price: 2400 })],
    event_participants: participants('b', ['p1', 'p2', 'p3', 'p4']),
    stays: [makeStay({ id: 'st', night_date: '2027-04-15', price: 1000 })],
  });
  renderWithTrip(<ExpensesTable highlight="p1" />, { state });
  expect(screen.getByText(/Hors restaurants et sorties gratuites/)).toBeInTheDocument();
  const row = screen.getByRole('row', { name: /Théo/ });
  expect(row).toHaveClass('me');
  expect(within(row).getByText(formatEuros(850))).toBeInTheDocument();
  expect(within(row).getByText(`+${formatEuros(150)}`)).toHaveClass('ok');
  const foot = screen.getByRole('row', { name: /Total groupe/ });
  expect(within(foot).getByText(formatEuros(3400))).toBeInTheDocument();
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npx vitest run src/features/roadbook`
Expected: FAIL — import introuvable.

- [ ] **Step 3: Implémenter**

`src/features/roadbook/ExpensesTable.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import { expensesByPerson } from '../../domain/expenses';
import { firstName, formatEuros } from '../../lib/format';

export function ExpensesTable({ highlight }: { highlight: string }) {
  const { state } = useReadyTrip();
  const rows = expensesByPerson(state);
  const sum = (k: 'lodging' | 'boat' | 'activities' | 'total') => rows.reduce((acc, r) => acc + r[k], 0);
  return (
    <section className="card">
      <h2>Dépenses estimées</h2>
      <p className="muted">Logements + bateau + grosses activités. Hors restaurants et sorties gratuites (randonnées, plages…).</p>
      <div className="table-scroll">
        <table className="expenses">
          <thead>
            <tr><th>Personne</th><th>Logements</th><th>Bateau</th><th>Activités</th><th>Total</th><th>Budget</th><th>Écart</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.personId} className={r.personId === highlight ? 'me' : ''}>
                <td>{firstName(state.people.find(p => p.id === r.personId)?.name ?? '?')}</td>
                <td>{formatEuros(r.lodging)}</td>
                <td>{formatEuros(r.boat)}</td>
                <td>{formatEuros(r.activities)}</td>
                <td><strong>{formatEuros(r.total)}</strong></td>
                <td>{r.budget == null ? '—' : formatEuros(r.budget)}</td>
                <td className={r.delta == null ? '' : r.delta >= 0 ? 'ok' : 'over'}>
                  {r.delta == null ? '—' : `${r.delta >= 0 ? '+' : ''}${formatEuros(r.delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total groupe</th>
              <td>{formatEuros(sum('lodging'))}</td>
              <td>{formatEuros(sum('boat'))}</td>
              <td>{formatEuros(sum('activities'))}</td>
              <td><strong>{formatEuros(sum('total'))}</strong></td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
```

`src/features/roadbook/RouteMap.tsx` :
```tsx
import { useEffect } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { RoutePoint } from '../../domain/itinerary';
import { OSM_ATTRIBUTION, OSM_URL } from '../../ui/MapPicker';

function FitBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
  }, [map, points]);
  return null;
}

export function RouteMap({ points }: { points: RoutePoint[] }) {
  if (!points.length) {
    return (
      <section className="card">
        <h2>Carte de l'itinéraire</h2>
        <p className="muted">Ajoute des points GPS aux activités et logements du planning pour voir l'itinéraire.</p>
      </section>
    );
  }
  const byTeam = new Map<string, RoutePoint[]>();
  for (const p of points) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
  return (
    <section className="card">
      <h2>Carte de l'itinéraire</h2>
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={10} className="map map-route">
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds points={points} />
        {[...byTeam].map(([teamId, pts]) => (
          <Polyline key={teamId} positions={pts.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: pts[0].color, weight: 3, dashArray: '6 6' }} />
        ))}
        {points.map((p, i) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: p.color, fillOpacity: 0.9 }}>
            <Tooltip>{i + 1}. {p.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </section>
  );
}
```

`src/features/roadbook/DayRecap.tsx` :
```tsx
import { useReadyTrip } from '../../data/TripContext';
import type { DayPlan } from '../../domain/itinerary';
import { durationLabel } from '../../domain/durations';
import { participantsOf } from '../../domain/conflicts';
import { BOAT_CATEGORY } from '../../domain/expenses';
import { PART_LABEL } from '../../domain/slots';
import { firstName, formatDay, formatEuros } from '../../lib/format';
import { LinkList } from '../../ui/Links';

export function DayRecap({ days }: { days: DayPlan[] }) {
  const { state } = useReadyTrip();
  const name = (id: string) => firstName(state.people.find(p => p.id === id)?.name ?? '?');
  const activity = (id: string) => state.activities.find(a => a.id === id);
  return (
    <section className="day-recap">
      {days.map(d => (
        <article key={d.date} className="card recap-day">
          <h3>{formatDay(d.date)}</h3>
          {d.entries.length === 0 && <p className="muted">Rien de prévu.</p>}
          {d.entries.map(en => (
            <div key={en.team.id} className="recap-team" style={{ borderColor: en.team.color }}>
              <h4>{en.team.name}</h4>
              <ul>
                {en.events.map(e => (
                  <li key={e.id}>
                    <span className="muted">{e.start_date === d.date ? PART_LABEL[e.start_part] : 'Suite'}</span>{' '}
                    <strong>{activity(e.activity_id)?.name}</strong> · {durationLabel(e.duration)}
                    {e.place_name && ` · 📍 ${e.place_name}`}
                    <div className="muted">{participantsOf(state, e.id).map(name).join(', ')}</div>
                    <LinkList links={e.links} />
                  </li>
                ))}
              </ul>
              {en.includedBy && (
                <p>🌙 {activity(en.includedBy.activity_id)?.category === BOAT_CATEGORY ? 'Nuit à bord' : `Nuit incluse (${activity(en.includedBy.activity_id)?.name})`}</p>
              )}
              {en.stay && (
                <p>
                  🌙 {en.stay.place_name || 'Logement'}
                  {en.stay.price != null && ` · ${formatEuros(en.stay.price)}${en.stay.price_mode === 'per_person' ? '/pers.' : ''}`}
                </p>
              )}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
```

`src/features/roadbook/RoadbookTab.tsx` (remplacement) :
```tsx
import { useMemo, useState } from 'react';
import { useReadyTrip } from '../../data/TripContext';
import { itinerary, routePoints } from '../../domain/itinerary';
import { ExpensesTable } from './ExpensesTable';
import { RouteMap } from './RouteMap';
import { DayRecap } from './DayRecap';

export function RoadbookTab() {
  const { state, me } = useReadyTrip();
  const [mine, setMine] = useState(false);
  const personId = mine ? me : null;
  const days = useMemo(() => itinerary(state, personId), [state, personId]);
  const points = useMemo(() => routePoints(state, personId), [state, personId]);
  return (
    <div className="roadbook">
      <label className="toggle">
        <input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} /> Mon parcours uniquement
      </label>
      <ExpensesTable highlight={me} />
      <RouteMap points={points} />
      <DayRecap days={days} />
    </div>
  );
}
```

- [ ] **Step 4: Lancer tests + build**

Run: `npm test && npm run build`
Expected: PASS ; build OK.

- [ ] **Step 5: Vérification manuelle**

Dans le navigateur : onglet Road-book → tableau des dépenses cohérent avec les prix saisis en Task 20, ligne de l'utilisateur surlignée ; carte avec points numérotés et tracé par équipe ; « Mon parcours uniquement » filtre récap et carte.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(road-book): récap, carte d'itinéraire et dépenses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Déploiement GitHub Pages et README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Créer `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Créer `README.md`**

````markdown
# 🌴 Martinique 2027

Organisateur de voyage collaboratif pour le groupe (15 → 25 avril 2027).

- **Envies** : chacun coche ses activités, la durée et son budget (logements + bateau + grosses activités, hors restos et sorties gratuites).
- **Planning** : on glisse les activités suggérées dans les créneaux, on crée des équipes parallèles (ex. bateau), on renseigne lieux GPS, prix, liens et commentaires.
- **Road-book** : récap jour par jour, carte, dépenses par personne.

Tout est partagé en temps réel.

## Partager l'app

Envoyer au groupe : `https://<utilisateur-github>.github.io/martinique-2027/#/t/<code-du-voyage>`

Le code du voyage est dans Supabase (`select code from trips;`). Toute personne ayant le lien peut modifier : ne le partagez qu'au groupe.

## Développement

```bash
cp .env.example .env.local   # renseigner URL + clé publishable Supabase
npm install
npm run dev                  # http://localhost:5173/martinique-2027/#/t/<code>
npm test
```

## Base de données

Migrations dans `supabase/migrations/` (à appliquer dans l'ordre), données initiales dans `supabase/seed.sql`. Les tables ne sont pas accessibles directement : tout passe par des fonctions RPC qui vérifient le code du voyage.

## Déploiement

Chaque push sur `main` lance les tests, le build et la publication sur GitHub Pages (`.github/workflows/deploy.yml`). Secrets du dépôt requis : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
````

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: déploiement GitHub Pages et README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Création du dépôt GitHub (action de l'utilisateur — `gh` n'est pas installé)**

Demander à l'utilisateur :
1. Créer un dépôt **public** vide `martinique-2027` sur https://github.com/new (sans README).
2. Dans *Settings → Secrets and variables → Actions*, ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (valeurs de `.env.local`).
3. Dans *Settings → Pages*, choisir *Source : GitHub Actions*.
4. Communiquer l'URL du dépôt.

- [ ] **Step 5: Pousser (après confirmation de l'utilisateur)**

```bash
git remote add origin https://github.com/<utilisateur>/martinique-2027.git
git push -u origin main
```
Expected: le workflow *Deploy* passe au vert ; l'app répond sur `https://<utilisateur>.github.io/martinique-2027/#/t/<code>`.

- [ ] **Step 6: Vérification finale en production**

Ouvrir l'URL publiée, choisir un prénom, cocher une envie, vérifier sur un second appareil/onglet que la modification apparaît. Donner à l'utilisateur le lien complet à partager au groupe.

Fin du plan.
