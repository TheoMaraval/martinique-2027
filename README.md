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
