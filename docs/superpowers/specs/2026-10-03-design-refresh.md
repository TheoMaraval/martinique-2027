# Refonte visuelle — « Lagon & coucher de soleil »

**Date :** 2026-10-03 · **Statut :** validé par l'utilisateur
Source : skill ui-ux-pro-max (palette voyage, typographie « Friendly SaaS », règles UX touch/accessibilité).

## Objectif
Rendre l'app plus soignée et plus agréable sur téléphone sans changer les fonctionnalités : identité tropicale (lagon + coucher de soleil + sable), icônes SVG cohérentes, contraste AA, zones tactiles ≥ 44 px, focus clavier visible, mouvements discrets.

## Design tokens (src/styles.css, `:root`)
| Rôle | Valeur | Note |
|---|---|---|
| `--lagoon-900` | `#0A4F5C` | texte sur fonds clairs teintés |
| `--lagoon-700` | `#0B7285` | **primaire** (blanc dessus ≈ 5,4:1) |
| `--lagoon-500` | `#0E9AA7` | accents, dégradé |
| `--lagoon-100` | `#DDF3F4` | fonds teintés, chips |
| `--sunset-600` | `#D9472B` | CTA / « hot » (blanc dessus ≥ 4,5:1) |
| `--sunset-500` | `#F26B4F` | accents décoratifs |
| `--sunset-100` | `#FFE8E1` | fonds teintés |
| `--sand-50` | `#FBF7F0` | fond d'app |
| `--sand-200` | `#EFE6D8` | bordures |
| `--ink` | `#14232E` | texte |
| `--muted` | `#566573` | texte secondaire (≥ 4,5:1 sur blanc et sable) |
| `--ok` `#15803D` · `--warn` `#B45309` (texte) / `--warn-bg` `#FFF4E0` · `--danger` `#B91C1C` |
| Rayons | `--r-sm 10px` · `--r-md 14px` · `--r-lg 20px` · pill `999px` |
| Ombres | `--shadow-1: 0 1px 2px rgba(20,35,46,.06), 0 1px 3px rgba(20,35,46,.08)` · `--shadow-2: 0 6px 20px rgba(20,35,46,.12)` |
| Espacements | échelle 4/8/12/16/24/32 |
| z-index | contenu 0 · header 40 · panneau « À placer » 45 · nav 50 · fiches 100 · toasts 110 (Leaflet confiné sous les fiches) |
| Transitions | 150–200 ms `ease-out`, uniquement `transform`/`opacity`/couleurs ; `@media (prefers-reduced-motion: reduce)` les coupe |

Équipes : palette `TEAM_COLORS` remplacée par des teintes lisibles avec texte blanc : `#D9472B, #6D28D9, #15803D, #B45309, #BE185D, #1D4ED8`.

## Typographie
- **Plus Jakarta Sans** (400/500/600/700/800) via Google Fonts dans `index.html` (`preconnect` + `display=swap`), repli `system-ui`.
- Corps 16 px (jamais < 16 px pour les champs, évite le zoom iOS), interligne 1.5 ; libellés secondaires 13–14 px ; titres 700–800 avec `letter-spacing: -0.01em`.

## Icônes
- Dépendance **`lucide-react`**, taille 18–20 px, `strokeWidth 2`, `aria-hidden` (le texte ou `aria-label` porte le sens).
- Remplacer **tous** les émojis d'interface : 🌴→`Palmtree`, 🗓️→`CalendarDays`, 🗺️→`Map`, 🔗→`Link2`/`ExternalLink`, 💬→`MessageCircle`, 🌙→`Moon`, ⚠️→`TriangleAlert`, 🗑️→`Trash2`, 📍→`MapPin`, ×→`X`, + →`Plus`, ▾/▴/▸→`ChevronDown`/`ChevronUp`/`ChevronRight`. Nuit bateau → `Ship`.
- Conserver les noms accessibles existants (`aria-label`, textes) : **les tests RTL doivent continuer à passer sans modification de leurs requêtes**, sauf si un texte visible change volontairement (alors adapter le test).

## Composants
- **En-tête** : dégradé `--lagoon-700 → --lagoon-500`, titre « Martinique 2027 » + icône palmier, sous-titre « 15 → 25 avril 2027 · 10 voyageurs · J-N » (N = jours jusqu'au 15/04/2027, calculé ; « C'est parti ! » si passé). Bouton identité = pastille avatar (initiales sur fond blanc translucide) + prénom + chevron.
- **Navigation basse** : 64 px + `env(safe-area-inset-bottom)`, icônes + libellés, onglet actif = pastille `--lagoon-100` derrière l'icône et texte `--lagoon-700` 700. ≥ 900 px : barre centrée max 520 px, coins arrondis, flottante à 12 px du bas.
- **Boutons** : hauteur min 44 px, rayon `--r-sm`, `cursor:pointer`, états hover/active/disabled, `:focus-visible` = anneau 3 px `--lagoon-500` avec offset 2 px. Variantes : `primary` (lagon), `danger` (texte rouge, bordure), `ghost`, `icon-btn` (44×44, rond).
- **Champs** : 44 px min, rayon `--r-sm`, bordure `--sand-200`, focus anneau lagon.
- **Cartes** : fond blanc, bordure `--sand-200`, rayon `--r-md`, `--shadow-1`.
- **Onglet Envies** :
  - Carte profil avec budget mis en avant (gros champ €) et mention en `--muted`.
  - Bandeau info avec icône `Users`.
  - « Top des envies » en liste podium (rang en pastille, ×N en badge corail).
  - Cartes activité : titre + badge ×N (corail), **durées en pilules toggle** (l'`<input type=checkbox>` reste dans le `<label>`, visuellement masqué mais focusable ; pilule cochée = fond lagon, texte blanc, icône `Check`), sélecteur de quantité compact, prénoms en **avatars-initiales** colorés (couleur dérivée du prénom) avec prénom en texte (pas uniquement l'initiale, pour que les tests et l'accessibilité gardent le prénom).
  - Titres de catégories avec petite icône (Bateau `Sailboat`, Mer `Waves`, Détente `Sun`, Nature `Mountain`, Local `Music`, autres `Sparkles`).
- **Identité** : écran d'accueil avec dégradé lagon en haut, palmier, « Qui es-tu ? », grille 2 colonnes de boutons avatar-initiales + prénom (≥ 56 px de haut).
- **Planning** :
  - Puces de jours = pilules, celle du jour visible en surbrillance au défilement (IntersectionObserver optionnel ; sinon état au clic).
  - Colonnes jour 300 px, en-tête jour collant.
  - Blocs équipe à bordure gauche épaisse colorée + libellé équipe en pastille.
  - Créneaux avec libellé discret et bouton `Plus` 36 px visible (zone 44 px).
  - Tuiles : fond `--sunset-100`, bordure gauche 4 px `--sunset-500`, titre 600, méta en `--muted`, icônes `Link2`/`MessageCircle` avec compteurs, état « suite » en pointillés, état alerte `--warn-bg`.
  - Ligne nuit avec icône `Moon` (ou `Ship` si « À bord »), lien logement = icône `ExternalLink` 44 px.
  - Panneau « À placer » : en-tête avec compteur en pastille ; éléments en cartes avec poignée `GripVertical` ; « hot » (N ≥ 3) = bordure corail + badge corail plein ; sinon badge `--lagoon-100`/texte lagon. Mobile : feuille basse avec poignée visuelle, coins arrondis en haut, ombre `--shadow-2`, `overscroll-behavior: contain`.
  - Barre d'alertes : icône `TriangleAlert`, fond `--warn-bg`, texte `--warn`.
  - Aperçu de glisser (`.drag-preview`) : carte blanche, ombre `--shadow-2`, légère rotation 2°.
- **Fiches (Sheet)** : feuille basse avec poignée sur mobile, en-tête collant, bouton fermer `X` 44 px, animation d'entrée translateY 16 px→0 + fondu (désactivée en reduced-motion), arrière-plan flou léger.
- **Road-book** : interrupteur « Mon parcours uniquement » en switch stylé ; tableau des dépenses avec en-tête collant, ligne courante surlignée, écarts en pastilles vert/rouge **avec signe +/− (la couleur n'est pas le seul indicateur)** ; carte arrondie ; récap jour en cartes avec pastille date, activités en timeline (point + ligne verticale).
- **Toasts** : carte sombre arrondie avec icône, au-dessus de la nav.
- **Lien invalide / chargement** : écran centré avec icône, chargement = petit spinner (reduced-motion → statique).

## Contraintes
- CSS pur dans `src/styles.css` (pas de Tailwind), classes existantes conservées autant que possible ; nouvelles classes autorisées.
- Aucun changement de logique métier, de données ni d'API.
- Responsive vérifié à 375, 768, 1024, 1440 px ; aucun défilement horizontal de page (seule la grille du planning défile).
- `npm test`, `npx tsc`, `npm run build` verts.
