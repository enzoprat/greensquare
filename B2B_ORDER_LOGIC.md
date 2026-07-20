# B2B_ORDER_LOGIC — Green Square

Toute la logique métier est centralisée dans **`src/lib/b2b.ts`** (fonctions pures,
testées) et appliquée côté serveur dans `src/lib/cart.ts`. Les templates ne calculent
jamais un prix ou une palette « en dur ».

## Unités, colis, palette

```
unités            = colis × unitsPerCase
prix_colis_ht     = unitPriceHtCents × unitsPerCase
total_ligne_ht    = unitPriceHtCents × unitsPerCase × colis
colis_dispo       = floor(stockUnits / unitsPerCase)
unités_par_palette= unitsPerCase × casesPerPallet         (si casesPerPallet connu)
palettes_pleines  = floor(colis / casesPerPallet)
colis_restants    = colis % casesPerPallet
```

Exemple (brief) : 24 colis/palette, 10 u/colis, 50 colis →
`2 palettes complètes + 2 colis`, `500 unités`. Couvert par un test.

Le prix étant stocké en **centimes entiers par unité**, tous les totaux sont exacts.

## Sélecteur par colis (`CaseSelector`)

Disponible sur cartes, fiche produit, résultats de recherche, panier (drawer + page).
Affiche : − / quantité colis / +, saisie clavier sécurisée, libellé « colis »,
total d'unités, prix du colis (pro), total de ligne, info palette. Bouton
**« + 1 palette »** qui ajoute exactement `casesPerPallet` colis (jamais 1 unité).

## Clamp / anti-fraude quantité (`clampCaseQuantity`)

Ramène toute quantité demandée à une valeur **valide et commandable** :
entier, ≥ 0, ≥ `minimumCases`, multiple de `caseOrderStep`, ≤ `colis_dispo`.
Rejette décimales, négatifs, multiples invalides et dépassements de stock. Exécuté à
chaque mutation **côté serveur** (`addToCart`/`setCartItem`) — le navigateur n'est
jamais la source de vérité.

## Minimum de commande 1 500 € HT (`evaluateMinimumOrder`)

S'applique au **sous-total net HT** (après remises, hors TVA et livraison).
`ORDER_MINIMUM_HT_CENTS = 150000` (configurable via `.env`).

Cas limites testés : 1 499,99 € (bloqué), 1 500,00 € (ok), 1 500,01 € (ok), remise
repassant sous le seuil (re-bloqué).

Sous le seuil (compte pro) : barre de progression, montant restant, bouton de
validation désactivé, message clair. Au-dessus : bouton actif.

## Validation serveur (équivalent Shopify Function)

`POST /api/checkout` → `validateCheckout()` re-vérifie **côté serveur**, avant de
créer la commande :

1. le compte est `PRO_VALIDE` ;
2. chaque produit est ACTIVE, a un colisage valide et un prix ;
3. chaque quantité est un multiple valide et respecte le stock (`clampCaseQuantity`) ;
4. le sous-total net HT ≥ 1 500 €.

Toute violation renvoie **HTTP 422** avec un message français. Désactiver le
JavaScript ne suffit pas à contourner : l'accès direct à l'API checkout est bloqué.
Vérifié par le script e2e (rejet 422 sous le minimum, succès au-dessus).

## Visibilité des prix

`canSeePrices(role)` → seuls `PRO_VALIDE` et `ADMIN`. Pour les autres, tout prix
devient `N/D` **et** est retiré des données envoyées au client (voir AUDIT § Sécurité).

## Panier groupé par marque

`buildCartView` regroupe les lignes par marque (préparation des commandes
fournisseurs) et renvoie sous-total HT, restant avant minimum, état du bouton, et la
raison de blocage éventuelle.
