# Audit — code et sécurité (v2, octobre 2026)

## Corrigé en passant de la v1 (mono-utilisateur) à la v2

| Problème v1 | Risque | v2 |
|---|---|---|
| Un seul mot de passe partagé (`APP_PASSWORD`) | impossible d'ouvrir l'app à d'autres ; fuite = tout exposé | comptes individuels, mots de passe hachés avec scrypt (sel aléatoire, comparaison à temps constant) |
| Cookie signé HMAC sans révocation | une session volée restait valable 90 jours | jeton aléatoire de 256 bits, seul son SHA-256 est stocké ; déconnexion, changement et réinitialisation du mot de passe révoquent les sessions |
| Pas de limite de tentatives (juste 1 s de délai) | devinette du mot de passe | 10 essais / 15 min par e-mail, 30 par IP ; inscriptions 5/h par IP ; réinitialisations 3/h ; IA : 3 programmes et 5 bilans par jour et par compte |
| Données globales | — | chaque requête filtre par `user_id` ; les séries passent par la séance du compte (`insert … select … where user_id = …`) ; une séance d'un autre compte renvoie 404 |
| Import = `truncate` de toute la base | un import cassé effaçait tout | import limité au compte, dans une transaction, champs bornés, ids régénérés |
| Aucun en-tête de sécurité | clickjacking, injection de scripts tiers | CSP (scripts du site seulement, `frame-ancestors 'none'`), HSTS, `nosniff`, Referrer-Policy, Permissions-Policy |

## Vérifié

- **Énumération de comptes** : la connexion et « mot de passe oublié » répondent pareil que l'e-mail existe ou non, et en temps comparable (hachage factice si le compte n'existe pas). L'inscription indique qu'un e-mail est déjà pris (inévitable sans vérification par e-mail).
- **Lien de réinitialisation** : jeton aléatoire, haché en base, valable 1 h, à usage unique ; l'URL du lien ne vient jamais de l'en-tête `Host` (empoisonnement impossible).
- **CSRF** : server actions protégées par Next.js (contrôle de l'origine) ; la route d'import vérifie l'origine ; cookie `SameSite=Lax`, `HttpOnly`, `Secure`.
- **Injection SQL** : toutes les requêtes sont paramétrées (`sql` en template). Les deux requêtes dynamiques n'interpolent que des noms de tables fixes.
- **XSS** : React échappe tout ; aucun `dangerouslySetInnerHTML` ; les liens des notes de recherche sont limités aux URL `https` réellement renvoyées par la recherche, avec `rel="noopener noreferrer nofollow"`.
- **IA** : la demande libre de l'utilisateur et les notes de recherche sont déclarées comme données dans le prompt ; la sortie est un JSON contraint par schéma, puis validée côté serveur (exercices hors liste retirés, séries 1-6, reps 1-30, repos 30-300 s, textes tronqués). L'IA ne déclenche aucune action.
- **Dépendances** : `npm audit` → 0 vulnérabilité. three.js supprimé (−600 ko).
- **Tests** : `npm test` (série, gels, objectif hebdo, progression) ; parcours complet testé dans un navigateur (inscription, onboarding, séance, nutrition, programme IA, bilan, traduction, export/import, déconnexion, isolation entre deux comptes, limitation des tentatives, réinitialisation, changement de mot de passe).

## Risques restants et recommandations

1. **Données de santé (RGPD)** : poids, alimentation et entraînement peuvent être des données de santé (art. 9). Avant d'ouvrir l'app au public : page de confidentialité, consentement explicite à l'inscription, mention des sous-traitants IA (OpenRouter et Anthropic, États-Unis) et des hébergeurs (Vercel, Neon). L'export et la suppression de compte existent déjà.
2. **Vercel Hobby = usage non commercial** : passer en Pro pour un produit public.
3. **Pas de vérification d'e-mail** : on peut créer un compte avec l'e-mail de quelqu'un d'autre (sans accès à ses données). À ajouter si l'app grandit (Resend est déjà branché).
4. **CSP avec `'unsafe-inline'`** pour les scripts (requis par Next.js sans nonces). Passer à des nonces si l'app grandit.
5. **Fuseau horaire fixe (Europe/Paris)** pour « aujourd'hui » et la série : correct en France, décalé ailleurs. Ajouter un fuseau par utilisateur pour un public international.
6. **Coût IA** : les limites par compte bornent l'abus, mais pas le nombre de comptes. Fixer une limite de crédit sur la clé OpenRouter (ou un plafond dans la console Anthropic).
7. **Sauvegardes** : Neon garde un historique court sur l'offre gratuite ; exporter régulièrement ou passer à une offre avec restauration plus longue.
8. **Images d'exercices** servies depuis GitHub (raw.githubusercontent.com, version figée) : pour une app publique, les copier sur un stockage à soi (Vercel Blob) pour ne pas dépendre de GitHub.

## Qualité du code

- ~3 900 lignes TypeScript (dont 300 de données d’aliments et de programmes), sans framework CSS ni librairie d'état. Toute la logique métier testable est en fonctions pures (`lib/streak.ts`, `lib/plan.ts`, `lib/nutrition.ts`, `nextTarget`).
- Un seul fichier parle à l'IA (`lib/ai.ts`), un seul au client SQL (`lib/db.ts` + actions).
- Coût de performance de la v2 : une requête de plus par page (vérification de session). Les pages restent préchargées et les actions optimistes (écran mis à jour avant la réponse du serveur).
