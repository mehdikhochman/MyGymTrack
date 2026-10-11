# MyGymTrack

Suivi musculation + nutrition personnel, avec un coach IA et une veille scientifique hebdomadaire.
Next.js 16 (App Router) · Postgres Neon · Claude Haiku 5.5 · déployé sur Vercel Hobby. Interface en français, unités en kg, installable en PWA.

## Fonctionnalités

- **Séance** : choisir les muscles, puis les exercices (5-6 prédéfinis par muscle, ou un exercice perso). Ajouter une série = toucher l'exercice puis « Ajouter la série » (2 taps, valeurs pré-remplies). La dernière performance s'affiche à l'ouverture d'un exercice.
- **Objectifs de la semaine** (lundi → dimanche) : séries par muscle vs cible (12-16 par défaut, Mollets 12), modifiables dans Réglages.
- **Nutrition** : repas (kcal + protéines, nom optionnel), totaux du jour vs cibles (2 950 kcal / 130 g par défaut), poids de corps et moyenne par semaine.
- **Historique** des séances, détail en un tap.
- **Sauvegarde** : export JSON complet et import (remplace tout, dans une transaction).
- **Coach** : « Analyser ma semaine » envoie au modèle 4 semaines de séries par muscle, la progression des exercices principaux, les calories/protéines des 14 derniers jours, la tendance du poids et les 10 dernières notes. Chaque rapport est sauvegardé.
- **Chercheur** : cron hebdomadaire (lundi ~5h UTC) qui cherche des études récentes sur des sources fiables et enregistre au plus 5 notes.

## Interface instantanée

Chaque tap met l'écran à jour tout de suite ; le serveur suit en arrière-plan.
- Onglets et liens principaux préchargés en continu (re-préchargés après chaque modification) : changer de page n'attend pas le réseau. Sinon, un squelette s'affiche immédiatement.
- Séries, repas, pesées, notes, objectifs : ajout et suppression affichés avant la réponse du serveur (`useInstantList`, `useOptimistic`). En cas d'échec, l'élément revient et un message s'affiche. Supprimer un élément encore en cours d'enregistrement attend son vrai id.
- « Commencer » ouvre la séance sans attendre sa création en base ; la dernière performance de chaque exercice est préchargée avec la page.
- Suppression de séance et déconnexion : la page suivante s'affiche d'abord, la requête part ensuite (une server action lancée pendant une navigation la bloquerait jusqu'à sa fin).
- Seule exception : l'analyse du coach dépend de l'IA (~20 s) ; un indicateur s'affiche immédiatement.

## Structure

```
app/            pages (Accueil, séance, nutrition, historique, coach, réglages, login)
app/actions.ts  toutes les mutations (server actions, chacune vérifie le cookie)
app/api/backup  export / import JSON
app/api/cron/research  tâche planifiée (protégée par CRON_SECRET)
lib/db.ts       client Neon + requêtes d'agrégats (calculées en SQL à la lecture)
lib/ai.ts       seul fichier qui appelle l'API du modèle
lib/coach.ts    données envoyées au coach
lib/auth.ts     mot de passe + cookie signé (HMAC)
proxy.ts        bloque toute page / API sans cookie valide
schema.sql      création des tables
```

## Limites des offres gratuites (vérifiées en octobre 2026)

| Service | Limite gratuite | Usage de l'app |
|---|---|---|
| Vercel Hobby – fonctions | 1 M d'invocations/mois, 4 h CPU actif, durée max 300 s | quelques milliers d'invocations/mois avec le préchargement (< 1 % du quota) ; le chercheur est limité à 300 s, le coach à 60 s |
| Vercel Hobby – cron | fréquence minimale 1×/jour, précision ±59 min | 1 cron, 1×/semaine |
| Neon Free | 0,5 Go par projet, 100 CU-heures/mois, mise en veille après 5 min | quelques Mo par an ; la base dort la plupart du temps |
| Anthropic API | payant à l'usage (pas d'offre gratuite) | voir coût estimé ci-dessous |

Pourquoi pas une IA gratuite : l'offre gratuite de Gemini existe, mais Google peut utiliser les données de l'offre gratuite pour améliorer ses produits (ici : poids, alimentation, entraînement), et ses quotas de recherche changent souvent. Claude Haiku 5.5 coûte quelques centimes par mois pour cet usage et inclut un outil de recherche web avec filtrage de domaines. Pour changer de fournisseur, il suffit de réécrire `lib/ai.ts`.

## Coût IA estimé

Prix Claude Haiku 5.5 : 0,10 $ / M tokens en entrée, 0,50 $ / M en sortie ; recherche web 10 $ / 1 000 recherches.

- Coach : ~4 k tokens en entrée + ~2-3 k en sortie ≈ **0,002 $ par analyse**. Même avec une analyse par jour : ~0,06 $/mois.
- Chercheur : 5 recherches max (0,05 $) + au plus 150 k tokens (≤ 0,02 $) ≈ **0,07 $ par exécution**, 4-5 exécutions/mois ≈ 0,30 $/mois.
- **Total : moins de 0,50 $/mois.** Un plafond de dépense de 5 $/mois laisse une large marge.

## Limites du chercheur

- 5 recherches web max par exécution (`max_uses`), uniquement sur ces domaines : PubMed/PMC (ncbi.nlm.nih.gov), JISSN, Springer, LWW, Taylor & Francis, Frontiers, MDPI, J. Physiology, Wiley, ScienceDirect, Nature, BMJ, Examine, Stronger By Science.
- 5 notes max ; une note n'est gardée que si son URL fait partie des résultats réellement renvoyés par la recherche (pas d'URL inventée) ; les doublons sont ignorés (URL unique en base).
- Budget de 150 k tokens vérifié entre chaque appel ; chaque appel est aussi plafonné par `max_tokens`.
- Le contenu web est traité comme une donnée : il ne fait que produire du texte stocké, jamais d'action.

## Développement local

```bash
npm install
cp .env.example .env.local   # remplir les variables
npm run dev
```

`DATABASE_URL` doit pointer vers une base Neon (le driver `@neondatabase/serverless` utilise l'API HTTP de Neon). Pour tester le cron : `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/research`.

## Inspiration (UX uniquement, aucun code repris)

- [wger-project/wger](https://github.com/wger-project/wger) : réunir entraînement, nutrition et poids de corps dans une seule app perso.
- [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym) : poids pré-remplis depuis la séance précédente, vue du volume par muscle, PWA installable.
- [Snouzy/workout-cool](https://github.com/Snouzy/workout-cool) : exercices rangés par muscle principal.
- [kcal-app/kcal](https://github.com/kcal-app/kcal) : journal alimentaire par jour avec totaux vs objectifs kcal/macros, saisie manuelle rapide.
- [brandonp2412/FitBook](https://github.com/brandonp2412/FitBook) : historique de poids simple (liste + date) et suivi des calories du jour vs objectif.
