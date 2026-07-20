# CSV_IMPORT_GUIDE — Green Square

Pipeline en 3 étapes, idempotent et traçable.

```
mondialfood.fr (Store API publique)
      │  npm run scrape:mondialfood
      ▼
imports/brands/{slug}/products-source.csv   (1 CSV par marque, éditable à la main)
imports/raw/mondialfood-raw.json            (snapshot brut)
imports/generated/scrape-report.json
      │  npm run import:build
      ▼
imports/generated/products-master.csv        (vue normalisée complète)
imports/generated/products-import.csv        (fichier prêt à charger)
imports/generated/brands.csv
imports/generated/import-errors.csv
imports/generated/import-report.json
      │  npm run import:load
      ▼
Base de données (produits en DRAFT tant que prix + colisage non validés)
```

## 1. Extraction — `npm run scrape:mondialfood`

- Utilise l'**API Store WooCommerce publique** (`/wp-json/wc/store/v1/products`),
  paginée automatiquement (aucun nombre de pages codé en dur), délai 1,2 s entre pages.
- Récupère uniquement du **public** : titre, descriptions (nettoyées), catégorie,
  marque, images, URL source, stock. **Le prix source est enregistré en référence
  seulement** (`source_price_ref_cents`), il n'est **pas** le prix de vente Green Square.
- La marque est déduite de la catégorie dont le lien contient `/marques/`.
- Colisage/SKU absents de la source → colonnes **laissées vides** + `needs_manual=1`.
- Idempotent : dédoublonnage par `source_id`, re-lançable sans créer de doublon.

## 2. Complétion manuelle (obligatoire avant publication)

Éditer `imports/brands/{slug}/products-source.csv` et renseigner :

| Colonne | Attendu |
| --- | --- |
| `sku` | **code article EBP** (jamais aléatoire) |
| `units_per_case` | entier > 0 |
| `cases_per_pallet` | entier > 0 (ou vide si inconnu) |
| `case_order_step`, `minimum_cases` | défaut 1 |
| `net_weight_g`, `storage_type`, `country_of_origin` | si connu |

Le **prix de vente HT** (`unit_price_ht_cents`) et le **stock** sont renseignés dans
`products-master.csv`/`products-import.csv` (ou via EBP) — voir étape 3.

## 3. Construction — `npm run import:build`

Fusionne les CSV marques → CSV générés. Clés de rapprochement (dans l'ordre) :
`sku` → `source_url` → `handle` → `marque+titre normalisé`.

Vérifie la cohérence (`units_per_case` entier > 0, `cases_per_pallet` entier > 0 ou
vide) et calcule `units_per_pallet`. Le **rapport** `import-report.json` indique :
pages explorées, produits trouvés/uniques, doublons ignorés, sans marque, sans image,
sans SKU, sans colisage, sans palette, sans prix, prêts à importer, à traiter
manuellement, erreurs de validation.

## 4. Chargement — `npm run import:load`

Upsert **non destructif** : marques par `slug`, produits par `handle` (repli `sku`).
Un produit sans prix valide **ou** sans `units_per_case` valide est forcé en **DRAFT**.
Re-lançable : les produits existants sont mis à jour, jamais dupliqués.

## Dry run recommandé

1. `npm run scrape:mondialfood` puis vérifier `scrape-report.json`.
2. Compléter le colisage/prix sur **quelques produits de 2–3 marques**.
3. `npm run import:build` → contrôler `import-report.json` et `import-errors.csv`.
4. `npm run import:load` → vérifier le rendu (`/catalogue`), images, champs, prix,
   quantités.
5. Seulement ensuite, compléter le reste du catalogue.

## Sécurité CSV

Écriture protégée contre l'**injection de formule** (préfixes `= + - @` neutralisés),
UTF-8, accents préservés, HTML source nettoyé (avis, blocs et coordonnées Mondial Food,
CTA retirés) sans altérer le sens.
