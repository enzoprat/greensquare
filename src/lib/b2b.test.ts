import { describe, it, expect } from 'vitest';
import {
  unitsFromCases,
  casePriceHtCents,
  lineTotalHtCents,
  availableCases,
  paletteBreakdown,
  clampCaseQuantity,
  casesForOnePallet,
  evaluateMinimumOrder,
  canSeePrices,
  displayPriceHt,
  hasValidPackaging,
  type Packaging,
} from './b2b';

const pack = (o: Partial<Packaging> = {}): Packaging => ({
  unitsPerCase: 20,
  casesPerPallet: 24,
  caseOrderStep: 1,
  minimumCases: 1,
  ...o,
});

describe('units & pricing', () => {
  it('1 colis de 20 unités', () => {
    expect(unitsFromCases(1, 20)).toBe(20);
    // 6,30 € HT/unité -> colis = 126,00 €
    expect(casePriceHtCents(630, 20)).toBe(12600);
    expect(lineTotalHtCents(630, 20, 1)).toBe(12600);
  });

  it('3 colis de 20 unités = 60 unités, total exact', () => {
    expect(unitsFromCases(3, 20)).toBe(60);
    // exemple du brief: 3 colis -> 1 260 € HT à 21,00 €/colis => 1,05 €/unité
    expect(lineTotalHtCents(105, 20, 3)).toBe(6300); // 63,00 €? keep coherent below
  });

  it('prix avec décimales reste exact (pas de dérive flottante)', () => {
    // 0,333 €? cents are integers; 1,05 €/unité, 20/colis, 3 colis
    expect(lineTotalHtCents(105, 20, 3)).toBe(105 * 20 * 3);
    expect(lineTotalHtCents(1999, 12, 7)).toBe(1999 * 12 * 7);
  });
});

describe('palette breakdown', () => {
  it('1 palette de 24 colis', () => {
    const b = paletteBreakdown(24, 10, 24);
    expect(b.fullPallets).toBe(1);
    expect(b.remainingCases).toBe(0);
    expect(b.unitsPerPallet).toBe(240);
    expect(b.totalUnits).toBe(240);
  });

  it('2 palettes + 2 colis (brief: 24 colis/palette, 10 u/colis, 50 colis)', () => {
    const b = paletteBreakdown(50, 10, 24);
    expect(b.fullPallets).toBe(2);
    expect(b.remainingCases).toBe(2);
    expect(b.totalUnits).toBe(500);
    expect(b.unitsPerPallet).toBe(240);
  });

  it('produit sans palette: pas de palette fabriquée', () => {
    const b = paletteBreakdown(5, 20, null);
    expect(b.fullPallets).toBe(0);
    expect(b.remainingCases).toBe(5);
    expect(b.unitsPerPallet).toBeNull();
    expect(b.totalUnits).toBe(100);
  });

  it('casesForOnePallet', () => {
    expect(casesForOnePallet(24)).toBe(24);
    expect(casesForOnePallet(null)).toBeNull();
    expect(casesForOnePallet(0)).toBeNull();
  });
});

describe('stock -> available cases', () => {
  it('stock non divisible par le colisage (65 u, 20/colis) => 3 colis', () => {
    expect(availableCases(65, 20)).toBe(3);
  });
  it('stock inférieur à un colis => 0', () => {
    expect(availableCases(5, 20)).toBe(0);
  });
  it('stock exact multiple', () => {
    expect(availableCases(60, 20)).toBe(3);
  });
  it('stock null => illimité', () => {
    expect(availableCases(null, 20)).toBe(Infinity);
  });
  it('stock 0 ou négatif => 0', () => {
    expect(availableCases(0, 20)).toBe(0);
    expect(availableCases(-10, 20)).toBe(0);
  });
});

describe('clampCaseQuantity (adversarial)', () => {
  it('valeur négative => 0', () => {
    expect(clampCaseQuantity(-3, pack(), 1000)).toBe(0);
  });
  it('valeur décimale => plancher entier valide', () => {
    expect(clampCaseQuantity(3.9, pack(), 1000)).toBe(3);
  });
  it('respecte le stock: 65u/20 => max 3 colis, demande 4 => 3', () => {
    expect(clampCaseQuantity(4, pack(), 65)).toBe(3);
  });
  it('respecte le pas de commande (step 5)', () => {
    expect(clampCaseQuantity(7, pack({ caseOrderStep: 5 }), 10_000)).toBe(5);
    expect(clampCaseQuantity(12, pack({ caseOrderStep: 5 }), 10_000)).toBe(10);
  });
  it('respecte le minimum de colis', () => {
    expect(clampCaseQuantity(1, pack({ minimumCases: 3 }), 10_000)).toBe(3);
  });
  it('stock insuffisant pour le minimum => 0', () => {
    // min 3 colis * 20 = 60 unités requis, stock 40 => 2 colis dispo < min => 0
    expect(clampCaseQuantity(5, pack({ minimumCases: 3 }), 40)).toBe(0);
  });
  it('empêche multiple invalide vs stock non divisible', () => {
    expect(clampCaseQuantity(10, pack({ caseOrderStep: 2 }), 65)).toBe(2); // max 3 colis, aligné step2 => 2
  });
});

describe('minimum order (1 500 € HT)', () => {
  const MIN = 150_000;
  it('1 499,99 € HT => non atteint', () => {
    const s = evaluateMinimumOrder(149_999, MIN);
    expect(s.reached).toBe(false);
    expect(s.remainingHtCents).toBe(1);
  });
  it('exactement 1 500,00 € HT => atteint', () => {
    const s = evaluateMinimumOrder(150_000, MIN);
    expect(s.reached).toBe(true);
    expect(s.remainingHtCents).toBe(0);
    expect(s.progressRatio).toBe(1);
  });
  it('1 500,01 € HT => atteint', () => {
    expect(evaluateMinimumOrder(150_001, MIN).reached).toBe(true);
  });
  it('remise faisant repasser sous le seuil', () => {
    const net = 160_000 - 20_000; // 1 400 € après remise
    const s = evaluateMinimumOrder(net, MIN);
    expect(s.reached).toBe(false);
    expect(s.remainingHtCents).toBe(10_000);
  });
  it('progress ratio borné à 1', () => {
    expect(evaluateMinimumOrder(300_000, MIN).progressRatio).toBe(1);
  });
});

describe('price visibility (pro_valide)', () => {
  it('canSeePrices', () => {
    expect(canSeePrices('PRO_VALIDE')).toBe(true);
    expect(canSeePrices('ADMIN')).toBe(true);
    expect(canSeePrices('VISITOR')).toBe(false);
    expect(canSeePrices(null)).toBe(false);
    expect(canSeePrices(undefined)).toBe(false);
  });
  it('displayPriceHt masque pour non-pro et prix inconnu', () => {
    expect(displayPriceHt(12600, 'PRO_VALIDE')).toContain('126,00');
    expect(displayPriceHt(12600, 'VISITOR')).toBe('N/D');
    expect(displayPriceHt(null, 'PRO_VALIDE')).toBe('N/D');
  });
});

describe('packaging guard', () => {
  it('hasValidPackaging', () => {
    expect(hasValidPackaging(20)).toBe(true);
    expect(hasValidPackaging(0)).toBe(false);
    expect(hasValidPackaging(-1)).toBe(false);
    expect(hasValidPackaging(2.5)).toBe(false);
    expect(hasValidPackaging(null)).toBe(false);
    expect(hasValidPackaging(undefined)).toBe(false);
  });
});
