# MyGymTrack

Suivi musculation + nutrition pour tout le monde, avec un coach IA qui écrit le programme et une série quotidienne façon Duolingo.
Next.js 16 (App Router) · Postgres Neon · Claude (Anthropic) · Vercel. Interface en français, unités en kg, installable en PWA (iPhone et Android).

## Fonctionnalités

- **Comptes** : inscription (prénom, e-mail, mot de passe), connexion, mot de passe oublié par e-mail, déconnexion, suppression du compte. Chaque donnée appartient à un compte ; aucune page ni action ne lit les données d'un autre.
- **Accueil en 4 étapes** : objectif (muscle, perte de gras, force, forme), séances par semaine, niveau, matériel (salle, haltères, sans matériel), corps (facultatif). L'app en déduit les objectifs calories / protéines / glucides / lipides (Mifflin-St Jeor) et un **programme de départ** sans IA.
- **Programme** : séances en rotation (full body, haut/bas, push/pull/jambes selon les jours dispo), avec pour chaque exercice séries × fourchette de répétitions et repos. Le **coach IA** le réécrit à la demande à partir de l'historique (volume réalisé, progression, régularité, poids, dernier bilan) et des souhaits de l'utilisateur (« genou fragile », « 45 min max »…). Il ne peut choisir que des exercices de la bibliothèque compatibles avec le matériel et le niveau ; la réponse est validée (exercices inconnus retirés, séries/reps/repos bornés).
- **Séance** : la séance du jour s'ouvre en un tap. Chaque exercice montre ses photos (départ / arrivée en alternance), l'objectif du jour (double progression dans la fourchette du coach : haut de fourchette atteint → + charge, sinon + 1 rep), la colonne « précédent », la saisie ✓, les records 🏆, le minuteur de repos réglé par le programme. On peut ajouter, remplacer ou créer un exercice.
- **Bibliothèque** : 657 exercices de musculation (free-exercise-db, domaine public) traduits en français, 11 groupes musculaires, filtres par muscle et matériel, photos, consignes (traduites en français par l'IA à la demande, une fois pour tous).
- **Série (flamme)** : toute séance, repas ou pesée du jour garde la flamme. 7 jours d'affilée = 1 gel de série (2 max) qui protège automatiquement un jour manqué. Paliers 3, 7, 14, 30, 50, 100… avec écran de célébration. Objectif hebdo de séances dessiné comme une barre à charger, semaines réussies d'affilée, calendrier des 5 dernières semaines. Rappel du soir par notification (web push) si rien n'est noté.
- **Nutrition** : reste à manger, macros, recherche dans 120 aliments courants (valeurs Ciqual) et dans Open Food Facts (produits, code-barres tapé), quantité en grammes, repas fréquents en 1 tap, saisie manuelle, dépense réelle calculée (apports − variation de poids) avec objectif conseillé selon le but.
- **Progrès** : flamme, gels, calendrier, records (1RM estimé et évolution sur 8 semaines), poids de corps, historique.
- **Bilan IA de la semaine** et **veille scientifique** hebdomadaire (cron), comme avant.
- **Mes données** : export JSON et import (remplace les données du compte).

## Ce qui a été repris de Duolingo

Ce qui rend la série de Duolingo efficace, et comment l'app l'adapte :

| Mécanisme Duolingo | Pourquoi ça marche | Dans MyGymTrack |
|---|---|---|
| Une petite action suffit à garder la série | effort minimal pour ne pas casser l'habitude | un repas ou une pesée suffit les jours sans séance |
| Gel de série (« streak freeze ») | protège d'un oubli sans décourager ; Duolingo a mesuré plus d'utilisateurs actifs quand on peut en détenir 2 | 1 gel tous les 7 jours, 2 max, utilisé automatiquement |
| Paliers célébrés (7, 30, 100, 365…) | renforcement et fierté | écran plein de célébration, partage |
| Peur de perdre (aversion à la perte) | la série devient précieuse | chiffre de la flamme toujours visible, grisé tant que rien n'est noté aujourd'hui, message « avant minuit » |
| Rappel le soir | la majorité des séries perdues le sont par oubli | notification vers 19 h si rien n'est noté |
| Objectif hebdomadaire | adapté à un sport qui ne se pratique pas tous les jours | barre à charger : une plaque par séance prévue |

Sources : blog de Duolingo (« How Duolingo's streak builds habit », articles sur le gel de série et les rappels), analyses publiques de la croissance de Duolingo (Lenny's Newsletter).

## Mise en route (Vercel + Neon)

1. Dans Neon → SQL Editor, coller et exécuter **tout** `schema.sql`. Il crée les tables et migre une base v1 sans rien perdre : les données existantes reviennent au compte dont l'e-mail est `OWNER_EMAIL` (à définir avant de créer ton compte ; sans cette variable, au tout premier compte créé).
2. Variables d'environnement (Vercel → Settings → Environment Variables), voir `.env.example` :
   - déjà là : `DATABASE_URL` (ou `POSTGRES_URL`), `CRON_SECRET`, `ANTHROPIC_API_KEY` ;
   - `APP_PASSWORD` et `AUTH_SECRET` ne servent plus (on peut les supprimer) ;
   - e-mails de réinitialisation : `RESEND_API_KEY`, `EMAIL_FROM` (compte gratuit sur resend.com, domaine vérifié) ;
   - rappels : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`), `VAPID_SUBJECT` (`mailto:ton@email`) ;
   - `OWNER_EMAIL` : ton e-mail, pour récupérer tes données actuelles ;
   - facultatif : `AI_COACH_MODEL`, `AI_MODEL`, `APP_URL`.
3. Redéployer.

## Coût IA

Modèles par défaut : **Claude Opus 5.5** pour le programme et le bilan (4 $ / 20 $ par million de tokens en entrée / sortie), **Claude Haiku 5.5** pour la traduction des consignes et la veille (0,10 $ / 0,50 $).

| Action | Estimation |
|---|---|
| Écrire un programme (liste d'exercices ≈ 10 k tokens + données + réflexion) | ≈ 0,15-0,25 $ |
| Bilan de la semaine | ≈ 0,05-0,10 $ |
| Traduire les consignes d'un exercice (une fois pour tous) | < 0,001 $ |
| Veille hebdomadaire (5 recherches web max) | ≈ 0,07 $ par semaine pour tout le site |

Utilisateur actif (2 programmes + 4 bilans par mois) : **≈ 0,50-0,90 $/mois**. Limites par compte : 3 programmes et 5 bilans par jour. Pour diviser le coût par ~40 : `AI_COACH_MODEL=claude-haiku-5-5` (programmes un peu moins fins). Fixer un plafond de dépense dans la console Anthropic.

## Limites des offres gratuites

| Service | Limite | Remarque |
|---|---|---|
| Vercel Hobby | 1 M invocations/mois, 300 s max, crons 1×/jour | **usage non commercial uniquement** : pour un vrai produit public, passer en Pro (20 $/mois) |
| Neon Free | 0,5 Go, 100 CU-heures/mois | quelques centaines d'utilisateurs actifs ; au-delà, offre payante |
| Resend Free | 3 000 e-mails/mois, 100/jour | largement suffisant pour les réinitialisations |
| Open Food Facts | gratuit, ~10 recherches/min par IP | appelé depuis le téléphone de l'utilisateur |

## Structure

```
app/                    pages : accueil, seance, nutrition, progres, coach, exercices, reglages,
                        login, inscription, mot-de-passe, bienvenue (onboarding)
app/actions.ts          mutations (server actions), chacune vérifie la session et ne touche que les lignes du compte
app/auth-actions.ts     inscription, connexion, réinitialisation, onboarding
app/api/backup          export / import JSON du compte
app/api/cron/research   veille hebdomadaire ; app/api/cron/remind : rappels du soir (CRON_SECRET)
lib/auth.ts             mots de passe (scrypt), sessions (jeton aléatoire, haché en base), limitation de débit
lib/db.ts               requêtes (toutes filtrées par utilisateur)
lib/plan.ts             programme : types, programme de départ, exercices autorisés
lib/streak.ts           série, gels, objectif hebdo (fonctions pures, testées)
lib/ai.ts               seul fichier qui appelle l'API du modèle
lib/exercises.json      bibliothèque générée par scripts/exercises.mjs (traductions : scripts/exercises-fr.json)
lib/foods.ts            aliments courants (pour 100 g)
public/sw.js            service worker des notifications
schema.sql              création + migration (idempotent)
```

## Développement

```bash
npm install
cp .env.example .env.local   # remplir
npm run dev
npm test                     # tests unitaires (série, gels, progression)
npm run exercises            # régénère la bibliothèque d'exercices
```

L'audit de sécurité et de code est dans [AUDIT.md](AUDIT.md).
