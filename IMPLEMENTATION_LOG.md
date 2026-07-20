# IMPLEMENTATION_LOG — Green Square

## Décisions structurantes

1. **Hors Shopify, greenfield.** Voir `AUDIT.md`. Toute la sémantique Shopify du brief
   a été portée sur une stack Next.js + Prisma autonome.
2. **Prix en centimes entiers, par unité.** Élimine toute dérive flottante ; tous les
   totaux (colis, ligne, minimum) sont exacts.
3. **UI en colis, stock en unités.** Conversion centralisée dans `src/lib/b2b.ts`.
4. **Serveur = source de vérité.** Chaque quantité est re-clampée et le minimum
   re-vérifié côté serveur ; le client ne fait qu'afficher.
5. **Prix jamais sérialisés pour les non-pro** (`product-dto.ts`) : pas de fuite HTML/
   JSON/data-attr/JSON-LD.
6. **Extraction via l'API Store WooCommerce publique** plutôt que scraping HTML : plus
   propre, paginé, respectueux (délai entre requêtes), uniquement du public.

## Ce qui est livré et vérifié

- Modèle de données complet (marques, produits, colisage, users, panier, commandes).
- Cœur métier B2B testé (30 tests) : colis/palette, stock, clamp, minimum, visibilité.
- Pipeline d'import idempotent (scrape → build → load) + rapports.
- 117 produits réels Mondial Food importés (en DRAFT, données manquantes signalées).
- Catalogue (filtre marques visuel, filtres catégorie/conservation/tri, recherche,
  URL synchronisée), pages marques, fiche produit (bloc logistique calculé, JSON-LD,
  breadcrumb), cartes produits avec sélecteur colis + bouton palette.
- Panier serveur groupé par marque, tiroir + page, barre de minimum, checkout validé
  serveur (équiv. Shopify Function), création de commande.
- Auth session + rôles + formulaire d'ouverture de compte pro.
- Build production OK ; 17 vérifications e2e au vert.

## Comptes de test (seed)

`admin@greensquare.eu` / `pro@greensquare.eu` / `visiteur@greensquare.eu` —
mot de passe **`greensquare`**.

## Données manuelles requises (rien n'a été inventé)

La source Mondial Food n'expose **ni SKU, ni colisage, ni tarif de vente**. À compléter
avant mise en production (voir `CSV_IMPORT_GUIDE.md`) :

- `sku` = **code article EBP** de chaque produit ;
- `units_per_case`, `cases_per_pallet`, `case_order_step`, `minimum_cases` ;
- `unit_price_ht_cents` (prix de vente HT Green Square) et `stock_units` ;
- poids, `storage_type`, `country_of_origin` quand disponibles ;
- logos et descriptions de marques (`Brand.logoUrl`, `Brand.description`) ;
- 12 produits « sans marque » à rattacher manuellement à leur marque réelle ;
- couleurs/typographie exactes de la charte green-square.eu à confirmer (les tokens
  actuels de `tailwind.config.ts` sont une DA agroalimentaire sobre à valider).

⚠️ Le seed (`prisma/seed.ts`) applique un colisage et des prix **de démonstration** sur
48 produits pour rendre l'app testable. Ces valeurs ne sont **pas** réelles et doivent
être remplacées par les vraies données / EBP.

## Reste à faire pour une V1 production (backlog priorisé)

- **P1** — Interface d'administration (validation des demandes pro → `PRO_VALIDE`,
  édition prix/stock/colisage). Aujourd'hui via seed / SQL.
- **P1** — Flux EBP/n8n : webhook sur création de commande, envoi SKU + quantité en
  unités + propriétés colis, idempotence par `Order.reference`, journal de
  synchronisation (le modèle `Order.ebpSyncedAt` est déjà prévu).
- **P2** — Tests Playwright (responsive, drawer clavier, multi-onglets, double-clic).
- **P2** — Galerie multi-images sur la fiche produit (le champ `galleryJson` existe).
- **P2** — `sitemap.xml` / `robots.txt`, `canonical` sur combinaisons de filtres.
- **P3** — Récupération automatique des logos de marques.

## Migration prod

Passer `prisma/schema.prisma` `provider = "postgresql"`, définir `DATABASE_URL`, puis
`prisma migrate deploy`. `ORDER_MINIMUM_HT_CENTS` reste configurable via l'environnement.
