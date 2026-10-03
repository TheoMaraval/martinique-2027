# Martinique 2027 — Organisateur de voyage collaboratif

**Date :** 2026-10-03
**Statut :** Validé (brainstorming)

## Objectif

Application web collaborative, en temps réel, pour organiser le voyage d'un groupe de 10 amis en Martinique. Chacun choisit ses envies d'activités, le groupe les place ensemble dans un planning qui accepte des équipes en parallèle (ex. une partie du groupe en bateau 4 jours pendant que l'autre fait surf/plage), puis l'application produit un road-book propre avec carte et résumé des dépenses.

## Contexte fixe

- **Voyageurs (10)** : Alexandre Martin, Baptiste Deschamps, Basile Boussemart, Inès De Passemar, Jarod Abelanet, Jules Berson, Louise Paurise, Nicolas Leblanc, Theo Maraval, Victoire Gonin. (Eugène Leconte ne participe pas.)
- **Aller** : jeudi 15 avril 2027, ORY 10:15 → FDF 13:00 (Aéroport Martinique Aimé Césaire).
- **Retour** : dimanche 25 avril 2027, FDF 16:20 → ORY lundi 26 avril 06:30.
- **Plage planifiable** : du 15/04 après-midi au 25/04 matin. Le 15 matin est marqué « Vol aller » ; le 25 après-midi et soir sont marqués « Départ » (non planifiables). Nuits planifiables : du 15 au 24 (10 nuits).
- Tout le monde prend les mêmes vols.

## Architecture

- **Front** : React + Vite + TypeScript, SPA statique, mobile-first, interface en français.
- **Back** : Supabase (Postgres + Realtime). Aucun serveur applicatif.
- **Glisser-déposer** : `dnd-kit` (support tactile).
- **Cartes** : Leaflet + tuiles OpenStreetMap ; recherche d'adresse via Nominatim.
- **Hébergement** : GitHub Pages, déployé par GitHub Action à chaque push sur `main`. Routage par hash (`#/…`) pour compatibilité Pages.
- **Dépôt** : GitHub `martinique-2027`. URL et clé publique (anon) Supabase injectées au build via secrets du dépôt.

### Accès et identité

- Lien secret partagé : `https://<user>.github.io/martinique-2027/#/t/<code-secret>`.
- À la première ouverture : écran « Qui es-tu ? » listant les 10 prénoms. Le choix est mémorisé en `localStorage` (avec try/catch ; si indisponible, on redemande). Bouton « Changer de personne » dans l'en-tête.
- Pas de mot de passe. Sécurité = connaissance du code : toutes les lectures/écritures passent par des fonctions RPC Postgres `security definer` qui prennent le code du voyage en paramètre et le vérifient. Les tables ont RLS activée sans policy pour le rôle `anon` (accès direct refusé). Pour le temps réel, voir « Temps réel ».
- Lien sans code ou code invalide → page « Lien invalide ».

### Temps réel

- Supabase Realtime **Broadcast** sur un canal nommé d'après le code du voyage : après chaque écriture réussie via RPC, le client émet un message `changed` ; les autres clients rechargent l'état complet via `get_trip` (anti-rebond 300 ms — l'état est petit). (Broadcast évite d'exposer les tables à `anon` comme l'exigerait Postgres Changes.)
- Dernier qui écrit gagne. Pas de verrouillage.
- Mises à jour optimistes ; rollback + toast si la RPC échoue.
- Bandeau « Hors ligne — reconnexion… » quand le canal est déconnecté ; rechargement complet à la reconnexion.

## Les trois onglets

Navigation par onglets en bas d'écran : **Envies**, **Planning**, **Road-book**.

### Onglet 1 — Envies

**Mon profil**
- Prénom + **budget max** (€).
- Mention affichée en permanence à côté du budget : *« Ce budget couvre logements + bateau + grosses activités payantes. Il ne comprend pas les restaurants ni les sorties gratuites (randonnées, plages, pique-niques…). »*

**Bandeau d'information** : *« Selon les envies, on ne sera pas toujours tous ensemble : le planning prévoit des équipes en parallèle. »*

**Catalogue** (cartes groupées par catégorie). Catalogue initial :

| Catégorie | Activité | Durées possibles |
|---|---|---|
| Bateau | Bateau multi-jours | 4j/3n, 3j/3n, 3j/2n |
| Bateau | Escapade bateau | demi-journée, journée |
| Mer | Pêche | demi-journée, journée |
| Mer | Surf | demi-journée, journée |
| Détente | Plage | demi-journée, journée |
| Détente | Pique-nique | demi-journée |
| Détente | Coucher de soleil | soir |
| Nature | Randonnée | demi-journée, journée (avec quantité) |
| Local | Cours de danse locale | demi-journée, soir |
| Local | Cours de cuisine locale | demi-journée |
| Local | Soirée locale | soir |
| Local | Goûter un mafé | soir, demi-journée |

- Sur chaque carte : je coche « Ça me tente », je choisis **une durée** parmi les durées possibles, et pour les activités avec quantité (Randonnée), je choisis **combien** (1–10).
- Une personne peut exprimer plusieurs envies pour une même activité avec des durées différentes (ex. Plage demi-journée ×1 et Plage journée ×1) : chaque couple (activité, durée) est une envie distincte.
- Pastilles des prénoms intéressés sur chaque carte, par durée (ex. « 4j/3n : Théo, Jules, Inès »).
- **Multiplicateur de succès** : chaque carte affiche un badge **×N** = nombre de personnes distinctes ayant suggéré l'activité (toutes durées confondues). Dans chaque catégorie, les cartes sont triées par ×N décroissant.
- **Top des envies** : en haut de l'onglet, un classement compact de toutes les activités suggérées, par ×N décroissant, pour voir d'un coup d'œil ce qui a le plus de succès.
- Chaque activité du catalogue peut porter une description et des **liens** (URL + libellé) visibles par tous.
- **Ajouter une activité** (depuis l'onglet Envies **ou depuis le Planning**) : nom, catégorie (existante ou nouvelle), durées possibles (cases à cocher parmi demi-journée / journée / soir / multi-jours avec nb jours et nb nuits), quantité oui/non, description, liens. Elle rejoint le catalogue commun de l'onglet Envies et **compte automatiquement comme une envie de son créateur** (première durée, ×1) ; elle apparaît donc aussitôt dans « À placer ». Seul son créateur peut la supprimer, et seulement si aucune activité planifiée n'y est rattachée.

### Onglet 2 — Planning

**Grille**
- Une colonne par jour du 15 au 25 avril, chaque jour découpé en créneaux **Matin / Après-midi / Soir**, plus une ligne **Nuit (logement)**.
- Sur mobile : défilement horizontal par jour, avec sélecteur de jour en haut ; sur grand écran : plusieurs jours visibles.
- Créneaux non planifiables (15 matin, 25 après-midi/soir) grisés avec libellé vol.

**Équipes**
- Par défaut une seule équipe « Tout le groupe » couvrant tout le séjour, contenant les 10 personnes.
- « + Équipe » : crée une équipe nommée (Équipe 2, 3… renommable), avec une couleur, sur une plage de créneaux (début → fin). On y déplace des prénoms ; une personne déplacée quitte « Tout le groupe » sur cette plage.
- Les équipes parallèles s'affichent en lignes empilées sur les jours concernés (Équipe 1 en haut, Équipe 2 en dessous…). Nombre d'équipes illimité.
- Une équipe garde la même composition sur toute sa plage (ex. 4 jours bateau).

**Activités à placer — mises en avant en permanence**
- Panneau **toujours visible** sur l'onglet Planning (colonne latérale sur grand écran, bandeau repliable en bas sur mobile, ouvert par défaut), pour ne pas avoir à retourner sur l'onglet Envies.
- Liste les envies **non encore placées**, regroupées par (activité, durée), triées par **nombre de personnes intéressées décroissant**, puis par multiplicateur de succès ×N de l'activité.
- Bouton **« + Suggérer une nouvelle activité »** dans le panneau : même formulaire que l'onglet Envies (voir ci-dessus).
- Chaque élément affiche un badge bien visible **« Suggérée par N »** et les prénoms concernés. Les éléments à N ≥ 3 sont surlignés (couleur d'accent).
- Une envie avec quantité (ex. Randonnée ×3) génère autant d'éléments que la quantité maximale demandée ; chaque élément affiche les prénoms qui en veulent au moins autant (rando n°1 : tous ceux qui en veulent ≥1, rando n°2 : ≥2, etc.).
- Un élément disparaît du panneau quand il a été placé (une activité planifiée y est rattachée). Il réapparaît si l'activité planifiée est supprimée.

**Glisser-déposer**
- On glisse un élément du panneau sur un créneau d'une équipe.
- Emprise : demi-journée = 1 créneau (matin ou après-midi), journée = matin + après-midi, soir = créneau soir, multi-jours = du créneau de départ jusqu'à N jours, en occupant aussi les nuits (N nuits).
- Sur mobile, un simple appui sur un élément du panneau ouvre « Placer… » (choix de l'équipe et du créneau) en alternative au glisser-déposer.
- Une activité planifiée peut être redéplacée (autre créneau / autre équipe) ou supprimée.
- On peut aussi créer une activité planifiée directement dans un créneau (bouton « + ») à partir du catalogue, sans envie préalable.
- **Une même activité peut être placée plusieurs fois** (ex. deux sessions de surf, plusieurs plages) : via le bouton « + » d'un créneau (tout le catalogue, sans limite), ou via **« Placer à nouveau »** dans la fiche d'une activité déjà placée (nouvelle occurrence, mêmes participants proposés, choix de l'équipe et du créneau).

**Fiche activité planifiée** (clic sur l'activité)
- **Participants** : préremplis avec les membres de l'équipe qui avaient suggéré l'activité (ou toute l'équipe si aucun d'eux n'y est) ; modifiables (ajout/retrait).
- **Lieu** : nom + **point GPS** (choisi en touchant une mini-carte Leaflet, par recherche d'adresse, ou en collant « lat, lng »). Coordonnées validées (lat ∈ [-90, 90], lng ∈ [-180, 180]) sinon message d'erreur.
- **Budget** optionnel : montant + mode **total** (réparti entre participants) ou **par personne**.
- **Liens** : liste d'URL avec libellé (site du loueur, réservation, avis…), ajout/suppression ; ouverts dans un nouvel onglet. URL validée (http/https).
- **Commentaires** : fil de discussion par activité (auteur, texte, date), ajout par n'importe qui, suppression par l'auteur. Compteur de commentaires et icône de lien visibles directement sur la tuile dans la grille.
- Notes libres.

**Ligne Nuit (logement)**
- Pour chaque nuit et chaque équipe présente cette nuit-là, on peut proposer **plusieurs options de logement** (phase brainstorm) : ville / nom du logement, point GPS, prix + mode (total/par personne), **liens vers le logement**, notes.
- On **retient une seule option** par équipe et par nuit (bouton radio « Retenu »). La première option proposée est retenue par défaut. Seule l'option retenue compte dans les dépenses, les alertes et le road-book.
- Affichage dans la grille : **« Nuit à <logement> »** + icône lien vers le logement retenu ; sinon « N options — à choisir » ; sinon « + Logement ».
- Pendant une activité multi-jours, la nuit de l'équipe concernée est automatiquement « À bord » (catégorie Bateau) ou « Inclus » (autres) — calculé, pas stocké ; prix inclus dans l'activité.

**Alertes** (surlignage orange + liste en haut du planning)
- Une personne a deux activités planifiées qui se chevauchent.
- Une personne n'a pas de logement pour une nuit (aucune équipe avec logement renseigné ne la contient).

### Onglet 3 — Road-book

- **Récap jour par jour** propre et lisible : pour chaque jour, chaque équipe avec ses activités (créneau, nom, lieu, participants, liens), puis **« Nuit à <logement retenu> »** avec ses liens (ou « Nuit à bord »).
- Filtre **« Mon parcours »** : n'affiche que ce que fait la personne connectée.
- **Carte d'itinéraire** Leaflet : points GPS des activités et logements, reliés dans l'ordre chronologique, une couleur par équipe ; respecte le filtre.
- **Résumé des dépenses condensé** :
  - Tableau par personne : Logements | Bateau | Activités | **Total** | Budget | Écart (vert si ≤ budget, rouge sinon).
  - Total du groupe.
  - Rappel : *« Hors restaurants et sorties gratuites. »*

## Modèle de données (Supabase / Postgres)

Un **créneau** est identifié par `(date, part)` avec `part ∈ {matin, aprem, soir}`. Les durées sont codées en texte : `half`, `day`, `evening`, `multi:<jours>:<nuits>` (ex. `multi:4:3`).

| Table | Colonnes principales |
|---|---|
Toutes les tables portent `trip_id` (y compris les tables de liaison) pour des contrôles d'accès uniformes.

| `trips` | `id`, `code` (unique, secret), `name`, `start_date`, `end_date` |
| `people` | `id`, `trip_id`, `name`, `budget_max` (numeric, nullable) |
| `activities` | `id`, `trip_id`, `name`, `category`, `durations` (text[] de codes durée), `has_quantity`, `description`, `links` (jsonb : `[{url, label}]`), `is_custom`, `created_by` (→ people) |
| `wishes` | `id`, `person_id`, `activity_id`, `duration` (text), `quantity` (int ≥ 1) — unique (`person_id`, `activity_id`, `duration`) |
| `teams` | `id`, `trip_id`, `name`, `color`, `start_date`, `start_part`, `end_date`, `end_part`, `is_default` |
| `team_members` | `team_id`, `person_id` |
| `events` | `id`, `trip_id`, `team_id`, `activity_id`, `duration` (text), `occurrence` (int, pour quantités), `start_date`, `start_part`, `place_name`, `lat`, `lng`, `price`, `price_mode` (`total`/`per_person`), `links` (jsonb), `notes` |
| `event_participants` | `event_id`, `person_id` |
| `event_comments` | `id`, `event_id`, `author_id` (→ people), `body`, `created_at` |
| `stays` | `id`, `trip_id`, `team_id`, `night_date`, `place_name`, `lat`, `lng`, `price`, `price_mode`, `links` (jsonb), `notes`, `chosen` (bool) — plusieurs options par (`team_id`, `night_date`), au plus une `chosen` (index unique partiel) |

- Un élément « à placer » est considéré placé lorsqu'il existe un `event` avec même `activity_id`, même `duration` et même `occurrence`.
- Script de seed : le voyage (code secret généré), les 10 personnes, le catalogue initial, l'équipe par défaut « Tout le groupe ».
- RPC : `get_trip(code)` (charge tout l'état), et une RPC par écriture (`upsert_wish`, `delete_wish`, `set_budget`, `upsert_activity`, `upsert_team`, `set_team_members`, `upsert_event`, `delete_event`, `set_event_participants`, `add_comment`, `delete_comment`, `upsert_stay`, `choose_stay`, `delete_stay`, …), toutes vérifiant `code`.

## Logique métier (fonctions pures, testées)

- `slotsOf(trip)` : liste ordonnée des créneaux planifiables.
- `spanOf(duration, startSlot)` : créneaux et nuits occupés.
- `unplacedItems(wishes, events, activities)` : éléments à placer avec « suggérée par N » et prénoms, triés.
- `conflicts(events, participants, stays, teams)` : chevauchements et nuits sans logement.
- `popularity(state)` : par activité, nombre de personnes distinctes l'ayant suggérée (×N).
- `shareOf(price, mode, nbParticipants)` : `mode === 'total' ? price / nb : price` (0 si pas de prix ou 0 participant).
- `expensesByPerson(...)` : par personne, sommes Logements / Bateau (catégorie Bateau) / Activités, total, écart au budget.

## Gestion des erreurs

- Échec RPC → rollback optimiste + toast en français.
- Canal temps réel déconnecté → bandeau + rechargement à la reconnexion.
- Lien invalide → page dédiée.
- Entrées invalides (GPS, URL, prix négatif) → validation côté client et côté RPC.
- `localStorage` indisponible → l'app fonctionne, redemande l'identité à chaque ouverture.

## Tests

- **Vitest** sur toute la logique pure ci-dessus, en TDD.
- **React Testing Library** sur les parcours clés : choisir son identité, cocher une envie, placer un élément, éditer une fiche (liens, commentaires), affichage du résumé des dépenses.
- Vérification manuelle dans le navigateur (mobile + desktop) avant livraison.

## Livraison

- Dépôt GitHub `martinique-2027`, branche `main`.
- Migrations SQL versionnées dans `supabase/migrations/` + seed.
- GitHub Action : install → test → build → déploiement GitHub Pages.
- README : configuration Supabase, secrets, et comment partager le lien secret au groupe.

## Hors périmètre (YAGNI)

- Comptes / mots de passe, rôles admin.
- Restaurants et dépenses courantes, remboursements entre amis (type Tricount).
- Réservation ou paiement en ligne.
- Mode hors ligne complet (seulement reconnexion).
- Historique / annulation des modifications.
