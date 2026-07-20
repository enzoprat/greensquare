# Green Square — Plateforme B2B agroalimentaire

Plateforme d'intermédiation agroalimentaire B2B. Catalogue multi-marques, commande par
**colis et palette**, tarifs réservés aux comptes professionnels validés, minimum de
commande **1 500 € HT**, paiement manuel / hors ligne.

Stack : **Next.js 15 (App Router, TS) + Prisma + SQLite (dev) / PostgreSQL (prod)**.
Voir `AUDIT.md` pour le choix « hors Shopify ».

## Démarrage

```bash
npm install
npm run db:generate && npm run db:push     # crée la base dev (SQLite)
npm run db:seed                            # comptes de test + échantillon démo
npm run dev                                # http://localhost:3000
```

Comptes de test (mot de passe `greensquare`) :
`admin@greensquare.eu`, `pro@greensquare.eu` (prix visibles), `visiteur@greensquare.eu`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | serveur Next |
| `npm test` | tests unitaires (Vitest) |
| `npm run scrape:mondialfood` | extraction produits (API publique WooCommerce) |
| `npm run import:build` | source CSV → CSV générés + rapport |
| `npm run import:load` | CSV générés → base (idempotent) |
| `node scripts/e2e-check.mjs http://localhost:3100` | parcours critiques |

## Documentation

- `AUDIT.md` — décisions d'architecture, sécurité des prix.
- `DATA_MODEL.md` — modèle de données.
- `CSV_IMPORT_GUIDE.md` — pipeline d'import détaillé.
- `B2B_ORDER_LOGIC.md` — calculs colis/palette, minimum, validation serveur.
- `TEST_REPORT.md` — résultats de tests.
- `IMPLEMENTATION_LOG.md` — journal + **données manuelles requises** + backlog.

## Exploitation

### Ajouter une nouvelle marque

1. **Import automatisé** : si la marque est extraite par le scraper, elle apparaît dans
   `imports/brands/{slug}/` et `imports/generated/brands.csv`. Compléter le colisage/SKU/
   prix (voir `CSV_IMPORT_GUIDE.md`), puis `npm run import:build && npm run import:load`.
2. **Manuellement** : insérer une ligne dans `Brand` (slug, name, logoUrl, description,
   displayOrder), puis rattacher ses produits (`Product.brandId`).
3. Renseigner `logoUrl` et `description` pour la page `/marques/{slug}` (SEO + filtre
   visuel par logo).

### Mettre à jour une marque existante

- Modifier `Brand` (nom, logo, description, `displayOrder`, `active`). Le logo est
  **centralisé** : ne pas le dupliquer sur chaque produit.
- Pour masquer une marque sans supprimer ses produits : `active = false`.
- Ré-importer un CSV mis à jour est non destructif (upsert par slug/handle).

### Valider un compte professionnel

Une demande (`ProAccountRequest`) passe en `PENDING`. Après vérification, passer
`User.role` à `PRO_VALIDE` (donne l'accès aux prix et à la commande). Une interface
d'admin est au backlog (P1) ; en attendant, opération en base.

## Flux EBP / n8n (à intégrer — point d'ancrage prévu)

Le projet étant neuf, aucun flux EBP/n8n n'existe encore. L'architecture est prête :

- **Shopify → EBP** devient **Green Square → EBP** : à la création d'une `Order`,
  déclencher un webhook (ou un job n8n) transmettant `sku` (= code EBP), la **quantité
  réelle en unités** (`caseQuantity × unitsPerCase`), le nombre de colis, la marque,
  la référence de commande, le client et les montants HT.
- **Idempotence** : utiliser `Order.reference` comme clé — une commande n'est jamais
  envoyée deux fois. `Order.ebpSyncedAt` marque l'envoi.
- **Journal** attendu : reçue / traitée / envoyée / rejetée / SKU manquant / échec de
  correspondance / nouvelle tentative / traitement manuel requis.

## Sécurité

Prix jamais exposés aux non-pro (retirés du DTO serveur) ; validation serveur du
minimum et des multiples de colis ; CSV protégés contre l'injection de formule ; HTML
source nettoyé ; secrets hors du dépôt (`.env`, ignoré par git).
