# Évolution v2 — créneau Midi, activités étirables, repas

**Date :** 2026-10-04 · **Statut :** validé par l'utilisateur
Origine : retour du groupe (« pique-nique demi-journée c'est chelou, il faudrait un choix midi »).

## Décisions validées
1. Un **vrai créneau « Midi »** : chaque jour = Matin · Midi · Après-midi · Soir.
2. **Plus de durée à choisir** pour les activités simples : on coche « Ça me tente » ; dans le planning l'activité occupe 1 créneau et on l'**étire** sur les créneaux suivants. Exception : les **séjours multi-jours** (bateau) gardent leurs formules (4j/3n…). La quantité (randonnées ×N) est conservée.
3. **Matin et Après-midi acceptent jusqu'à 2 activités** à la suite par équipe (ex. surf puis plage) sans alerte entre elles ; Midi et Soir : 1 activité.
4. **Repas en option** : par équipe et par jour, « Déjeuner » et « Dîner » (lieu GPS, liens, prix **pour info**, notes). Les repas **ne comptent pas** dans les dépenses. Une **activité** placée au Midi (ex. cours de cuisine) compte normalement.
5. **Conversion des données existantes** (envies, activités, activités placées), avec sauvegarde préalable.

## Créneaux
- `PARTS = ['matin','midi','aprem','soir']`, libellés Matin / Midi / Après-midi / Soir ; 4 créneaux par jour (44 au total), `index = jour*4 + rang`.
- Bloqués : 15/04 **Matin et Midi** (« Vol aller », arrivée 13:00) ; 25/04 **Après-midi et Soir** (« Départ », vol 16:20).
- Capacité par équipe et par créneau : `matin 2, midi 1, aprem 2, soir 1` (constante `SLOT_CAPACITY`).

## Durées
- Codes : `flex` (activité simple) et `multi:<jours>:<nuits>`. Les anciens codes `half`/`day`/`evening` restent lisibles (traités comme `flex`) par sécurité, mais n'existent plus après migration.
- Emprise `flex` : du créneau de début au créneau de fin **inclus** (champs `end_date`/`end_part` de l'activité placée ; absents → 1 seul créneau). Seuls les créneaux planifiables comptent.
- Emprise `multi` : inchangée (du créneau de départ jusqu'au soir du jour J, nuits incluses), Midi compris.

## Placement, étirement, conflits
- `canDrop(s, teamId, idx, duration, ignoreEventId?)` : créneaux planifiables, couverts par l'équipe, et **capacité non dépassée** sur chaque créneau de l'emprise (en ignorant l'activité déplacée).
- Une activité `flex` déposée occupe 1 créneau. **Étirer** : dans la fiche activité, sélecteur « Jusqu'à » (créneaux suivants valides) + boutons « Étendre d'un créneau » / « Réduire d'un créneau ». Validation `canResize(s, eventId, endIdx)` (fin ≥ début, couverture équipe, capacité).
- Déplacer une activité étirée conserve sa longueur (même nombre de créneaux) si possible, sinon la ramène à 1 créneau.
- **Alerte de chevauchement** : pour une personne, si sur un créneau le nombre d'activités auxquelles elle participe dépasse la capacité du créneau (2 le matin/après-midi, 1 midi/soir).
- Dans une case à 2 activités, elles sont affichées dans l'ordre (début puis identifiant, ordre stable) avec « 1. » / « 2. ».

## Envies
- Activité simple : une pilule unique **« Ça me tente »** (+ « Combien ? » si quantité).
- Multi-jours : pilules des formules, comme aujourd'hui.
- Ajout d'activité : choix « Activité simple (se place et s'étire dans le planning) » ou « Séjour de plusieurs jours » (formules jours/nuits). L'envie du créateur reste ajoutée automatiquement.
- « À placer » : les activités simples n'affichent plus de durée ; les multi affichent leur formule.

## Repas
- Table `meals` : `id, trip_id, team_id, date, kind ('dejeuner'|'diner'), place_name, lat, lng, links (check http(s)), price, price_mode, notes`, unique `(team_id, date, kind)`.
- RPC : `upsert_meal(p_code, p)` (insert ou mise à jour sur `(team_id, date, kind)`), `delete_meal(p_code, p_id)` ; `get_trip` renvoie `meals`.
- Grille : dans chaque bloc d'équipe, sous Midi une ligne « Déjeuner », sous Soir une ligne « Dîner » (seulement si l'équipe couvre ce créneau et qu'il est planifiable). Vide → bouton discret « + Déjeuner » / « + Dîner » ; rempli → « Déjeuner : <lieu> » + lien.
- Fiche repas : lieu (PlaceField), liens, prix libellé « Prix (pour info, hors budget) », notes, supprimer.
- Road-book : les repas apparaissent dans le récap du jour et sur la carte ; **jamais** dans les dépenses ni dans les alertes.

## Migration `0005_midi_flex_repas.sql`
1. Sauvegarde : schéma `backup` (aucun droit pour anon/authenticated) avec copies `wishes_20261004`, `activities_20261004`, `events_20261004`.
2. Contraintes `start_part`/`end_part` (teams, events) étendues à `'midi'`.
3. `events` : colonnes `end_date date`, `end_part text` (check 4 valeurs).
4. Conversion des activités placées : `half` → `flex` (fin = début) ; `evening` → `flex` au soir ; `day` → `flex` de Matin (ou du premier créneau planifiable du jour) à Après-midi.
5. Conversion des activités : durées non multi → `{flex}` ; multi conservées.
6. Conversion des envies non multi → `flex`, en fusionnant les doublons (même personne + activité) et en gardant la plus grande quantité.
7. Table `meals` + RPC, `get_trip` et `upsert_event` mis à jour (fin d'emprise), bloc revoke/grant complet.

## Tuto
- Étape 2 : « Coche les activités qui te tentent (et la formule pour le bateau)… »
- Étape 3 : « …Glisse-les dans un créneau puis étire-les si besoin. Le Midi sert aux pique-niques ou cours de cuisine, et tu peux noter où l'on déjeune et dîne. »

## Tests
TDD sur : créneaux à 4 parts et blocages, emprise flex/multi, capacité et `canDrop`/`canResize`, alertes avec capacité, conversion des clés legacy, dépenses (repas exclus, activité au midi incluse), itinéraire avec repas, envies « Ça me tente », formulaire d'ajout simple/multi, fiche repas.
