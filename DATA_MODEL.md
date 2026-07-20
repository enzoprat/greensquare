# DATA_MODEL — Green Square

Source de vérité : `prisma/schema.prisma`. Dev = SQLite ; prod = PostgreSQL
(changer `provider` + `DATABASE_URL`, puis `prisma migrate`).

## Principes

- **Prix HT par unité, en centimes entiers** (`unitPriceHtCents`). Aucun flottant →
  aucune dérive de calcul.
- **Stock en unités** (`stockUnits`). L'UI raisonne en **colis** ; les unités sont
  toujours dérivées (`unités = colis × unitsPerCase`).
- **Une donnée inconnue reste NULL/vide**, jamais 0.

## Brand (marque)

| Champ | Type | Rôle |
| --- | --- | --- |
| slug | string unique | identifiant URL `/marques/{slug}` |
| name | string | nom commercial |
| logoUrl, coverUrl | string? | visuels centralisés (pas dupliqués par produit) |
| description, country, website | string? | page marque + SEO |
| displayOrder, active | int, bool | ordre et statut d'affichage |

Un produit appartient à **exactement une** marque (`Product.brandId`).

## Product

Informations principales : `handle` (unique), `title`, `brandId`, `category`,
`productType`, `sku` (unique, = code EBP), `ean`, `shortDesc`, `description`,
`imageUrl`, `galleryJson`, `status` (DRAFT|ACTIVE), `sourceUrl`, `lastImport`.

Prix / stock : `unitPriceHtCents` (HT/unité), `stockUnits`.

Logistique (équivalent `custom.*`) :

| Champ | Contrainte | Règle |
| --- | --- | --- |
| unitsPerCase | entier > 0 | obligatoire pour rendre commandable |
| casesPerPallet | entier > 0 ou NULL | palette calculée seulement si présent |
| caseOrderStep | entier ≥ 1 | pas de commande en colis |
| minimumCases | entier ≥ 1 | minimum de colis par ligne |
| netWeightG, caseWeightG | int? | poids |
| storageType | ambient\|chilled\|frozen | conservation |
| storageTempC, countryOrigin, leadTime | string? | infos logistiques |

Cohérence : si `casesPerPallet` présent → `unitsPerPallet = unitsPerCase ×
casesPerPallet` (calculé, jamais stocké). Un produit sans prix **ou** sans
`unitsPerCase` valide est forcé en **DRAFT** (non publié, non commandable).

## User / Session / ProAccountRequest

- `User.role` : `VISITOR` (prix masqués, ne peut pas commander) → `PRO_VALIDE`
  (prix visibles, commande possible) → `ADMIN`. Remplace le tag `pro_valide`.
- `Session` : cookie httpOnly `gs_session`, expiration 30 j.
- `ProAccountRequest` : formulaire pro (raison sociale, SIRET, TVA, etc.), statut
  PENDING/APPROVED/REJECTED. La validation passe `role` à `PRO_VALIDE`.

## Cart / CartItem

- `Cart` rattaché à un cookie `gs_cart` (anonyme) et/ou à un `userId`.
- `CartItem.caseQuantity` = **nombre de colis** (source de vérité UI). `unitsPerCase`
  est snapshoté à l'ajout pour l'intégrité de ligne (équiv. `_b2b_qpc`).
- Toute mutation est **re-clampée côté serveur** (stock, step, min, entier positif).

## Order / OrderItem

Commande manuelle/hors ligne. `reference` unique (clé d'idempotence pour un futur
flux EBP), `subtotalHtCents`, `status` (RECEIVED→PROCESSED→SENT_TO_EBP|REJECTED),
`ebpSyncedAt`. Chaque `OrderItem` fige `sku`, `brandName`, `caseQuantity`,
`unitsPerCase`, `unitPriceHtCents` (transmet le code EBP + quantité réelle en unités).
