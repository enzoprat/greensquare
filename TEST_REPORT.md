# TEST_REPORT — Green Square

## Commandes

```bash
npm test                 # tests unitaires (Vitest)
npm run build            # build production (typecheck complet)
node scripts/e2e-check.mjs http://localhost:3100   # parcours critiques (serveur lancé)
```

## Résultats (dernière exécution)

- **Typecheck / build** : OK — 13 routes générées, 0 erreur.
- **Tests unitaires** : **30 / 30** au vert (`src/lib/b2b.test.ts`, `src/lib/csv.test.ts`).
- **e2e parcours critiques** : **17 / 17** au vert.

## Couverture unitaire (calculs B2B — `b2b.test.ts`)

- Unités & prix : 1 colis/20 u, 3 colis/20 u, prix à décimales (exactitude centimes).
- Palette : 1 palette de 24 colis ; 2 palettes + 2 colis ; produit sans palette (aucune
  palette fabriquée) ; `casesForOnePallet`.
- Stock → colis : 65 u / 20 = 3 colis ; stock < 1 colis = 0 ; stock null = illimité ;
  stock 0/négatif = 0.
- `clampCaseQuantity` (adversarial) : négatif → 0 ; décimal → plancher ; respect du
  stock, du pas, du minimum ; stock insuffisant pour le minimum → 0 ; multiple invalide
  vs stock non divisible.
- Minimum 1 500 € HT : 1 499,99 (bloqué) / 1 500,00 (ok) / 1 500,01 (ok) ; remise
  repassant sous le seuil ; ratio borné.
- Visibilité prix : `canSeePrices`, `displayPriceHt` masque non-pro et prix inconnu.
- Garde colisage (`hasValidPackaging`).

## Couverture CSV (`csv.test.ts`)

- Aller-retour avec accents et caractères spéciaux préservés.
- Neutralisation de l'injection de formule (`= + - @`).

## Couverture e2e (`scripts/e2e-check.mjs`, loops 3/4/6)

- **Fuite de prix** : un visiteur ne voit que `N/D` sur la fiche produit ; aucun prix
  réel dans le HTML ; le JSON panier masque `subtotal` et `canSeePrice=false`.
- **Cohérence quantité** : ajout de 3 colis → `caseQuantity=3`, `totalUnits = 3 × upc`.
- **Adversarial** : `add` négatif = no-op (ligne inchangée) ; `set` 99999 clampé au
  stock disponible.
- **Minimum serveur** : panier sous 1 500 € → checkout **HTTP 422** ; une fois le
  minimum atteint → checkout **200** avec référence de commande.

## Tests recommandés à ajouter (non couverts dans cette itération)

- **Playwright** sur navigateur réel pour : rendu responsive (320→1920 px), tiroir
  panier (ouverture/fermeture clavier), double-clic « Ajouter », multi-onglets,
  retour navigateur, fusion de lignes.
- Import : chargement du même CSV deux fois (idempotence) — couvert manuellement, à
  automatiser.
