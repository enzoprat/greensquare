# AUDIT — Green Square

## Contexte et décision de plateforme

Le brief initial était rédigé en vocabulaire **Shopify** (Liquid, Shopify Functions,
métaobjets, tag client `pro_valide`, import CSV Shopify, checkout Shopify), mais sa
première consigne imposait l'inverse : « le site va être 100 % généré ici et propulsé
ici, on ne fait rien sur Shopify ».

Décision validée avec le client :

- **Stack autonome, hors Shopify.** Chaque concept Shopify a été réinterprété en
  équivalent maison (voir tableau ci-dessous).
- **Projet greenfield.** Le dossier de travail était vide : il n'y avait aucune base
  Green Square à auditer. Cet audit documente donc les **choix d'architecture**, pas
  un existant à corriger.

| Concept Shopify du brief            | Équivalent maison livré                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| Thème Liquid / sections             | Next.js App Router (React Server Components + Tailwind)              |
| Shopify Function de validation panier | Validation serveur dans `POST /api/checkout` + `validateCheckout()` |
| Métaobjet marque                    | Modèle Prisma `Brand`                                               |
| Tag client `pro_valide`             | `User.role = PRO_VALIDE` (enum)                                     |
| Champs méta `custom.*`              | Colonnes `Product` (unitsPerCase, casesPerPallet, …)                |
| Import CSV Shopify                  | Pipeline CSV maison (`scrape` → `build-import` → `load-products`)   |
| `routes.cart_url`, `routes.account_url` | Routes Next natives `/panier`, `/connexion`, `/compte/*`        |
| Checkout Shopify                    | Flux de commande manuel/hors ligne (`Order`, paiement à la livraison) |

## Stack retenue (justification)

- **Next.js 15 (App Router) + TypeScript** : SSR pour le SEO, RSC pour ne jamais
  envoyer de prix au client non autorisé, route handlers pour l'API — un seul
  déploiement, pas de dépendance externe.
- **Prisma + SQLite (dev) / PostgreSQL (prod)** : modèle typé, migrations, upserts
  idempotents pour l'import.
- **Auth par session** (cookie httpOnly + table `Session`, bcrypt) : simple, sans
  service tiers.
- **Vitest** (logique métier) + **script e2e** (parcours critiques).

## Sécurité des prix (P0)

Le point le plus sensible du B2B : **aucun prix ne doit fuiter** vers un visiteur ou un
compte non validé. Traitement :

- La sérialisation produit unique (`src/lib/product-dto.ts`) **supprime** le prix du
  DTO quand `role !== PRO_VALIDE|ADMIN`. Le prix n'existe donc ni dans le HTML, ni dans
  le JSON, ni dans un attribut `data-*`, ni dans le JSON-LD (offre sans prix).
- Le panier serveur (`buildCartView`) renvoie `subtotalHtCents: null` et `N/D` pour les
  non-pro.
- Vérifié automatiquement par le script e2e : un visiteur ne voit que `N/D` et la
  mention fixe « 1 500 € HT » du minimum (aucun prix réel).

## Points nécessitant une donnée manuelle (signalés, non inventés)

La source Mondial Food (WooCommerce Store API publique) **n'expose ni SKU, ni
colisage, ni tarif Green Square**. Conformément au brief, rien n'est inventé :

- `sku` (= code article EBP), `unitsPerCase`, `casesPerPallet`, `unitPriceHtCents`,
  `stockUnits`, poids/origine → **vides**, produits chargés en **DRAFT**.
- Le seed (`prisma/seed.ts`) pose des valeurs **de démonstration** sur un échantillon
  (clairement identifiées) uniquement pour exercer l'UI et les flux.

Voir `IMPLEMENTATION_LOG.md` § « Données manuelles requises ».

## État de sortie

- Build production OK (13 routes), 30 tests unitaires + 17 vérifications e2e au vert.
- Aucun reste d'anciens domaines (`adjadjcompagnie.fr`) : projet neuf.
