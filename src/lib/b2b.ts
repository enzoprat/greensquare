/**
 * Green Square — B2B core business logic.
 *
 * Single source of truth for all colis (case) / palette / minimum-order maths.
 * All money is handled as integer cents (HT, per unit) to avoid float drift.
 * The UI reasons in CASES; Shopify-equivalent unit quantity is always derived.
 *
 * Invariants enforced here (do NOT duplicate elsewhere):
 *   units          = cases * unitsPerCase
 *   casePriceHt    = unitPriceHt * unitsPerCase
 *   lineTotalHt    = unitPriceHt * unitsPerCase * cases
 *   availableCases = floor(stockUnits / unitsPerCase)
 */

export const ORDER_MINIMUM_HT_CENTS = Number(
  process.env.ORDER_MINIMUM_HT_CENTS ?? 150_000,
); // 1 500,00 € HT

export interface Packaging {
  unitsPerCase: number; // strictly positive integer
  casesPerPallet: number | null; // strictly positive integer or null
  caseOrderStep: number; // step in cases (>=1)
  minimumCases: number; // minimum cases per line (>=1)
}

export interface PaletteBreakdown {
  fullPallets: number;
  remainingCases: number;
  unitsPerPallet: number | null; // null when casesPerPallet unknown
  totalUnits: number;
}

/** Guard: a usable packaging must have a strictly positive integer unitsPerCase. */
export function hasValidPackaging(unitsPerCase: number | null | undefined): unitsPerCase is number {
  return typeof unitsPerCase === 'number' && Number.isInteger(unitsPerCase) && unitsPerCase > 0;
}

/** Build a Packaging from a product-like row. Throws if unitsPerCase is invalid. */
export function packagingOf(p: {
  unitsPerCase: number | null;
  casesPerPallet: number | null;
  caseOrderStep: number;
  minimumCases: number;
}): Packaging {
  if (!hasValidPackaging(p.unitsPerCase)) {
    throw new Error('packagingOf: invalid unitsPerCase');
  }
  return {
    unitsPerCase: p.unitsPerCase,
    casesPerPallet: p.casesPerPallet,
    caseOrderStep: p.caseOrderStep,
    minimumCases: p.minimumCases,
  };
}

/** units = cases * unitsPerCase */
export function unitsFromCases(caseQuantity: number, unitsPerCase: number): number {
  assertPositiveInt(unitsPerCase, 'unitsPerCase');
  return caseQuantity * unitsPerCase;
}

/** casePriceHt = unitPriceHt * unitsPerCase (exact, integer cents). */
export function casePriceHtCents(unitPriceHtCents: number, unitsPerCase: number): number {
  assertPositiveInt(unitsPerCase, 'unitsPerCase');
  return unitPriceHtCents * unitsPerCase;
}

/** lineTotalHt = unitPriceHt * unitsPerCase * cases (exact, integer cents). */
export function lineTotalHtCents(
  unitPriceHtCents: number,
  unitsPerCase: number,
  caseQuantity: number,
): number {
  return casePriceHtCents(unitPriceHtCents, unitsPerCase) * caseQuantity;
}

/**
 * Orderable cases given unit stock. Units that don't complete a full case are
 * NOT orderable. Returns 0 when stock is untracked-negative or below one case.
 */
export function availableCases(stockUnits: number | null | undefined, unitsPerCase: number): number {
  assertPositiveInt(unitsPerCase, 'unitsPerCase');
  if (stockUnits == null) return Infinity; // untracked stock => unlimited
  if (stockUnits <= 0) return 0;
  return Math.floor(stockUnits / unitsPerCase);
}

/**
 * Palette breakdown for a given case quantity.
 * Never fabricates a palette when casesPerPallet is unknown.
 *   fullPallets    = floor(cases / casesPerPallet)
 *   remainingCases = cases % casesPerPallet
 */
export function paletteBreakdown(
  caseQuantity: number,
  unitsPerCase: number,
  casesPerPallet: number | null,
): PaletteBreakdown {
  assertPositiveInt(unitsPerCase, 'unitsPerCase');
  const totalUnits = unitsFromCases(caseQuantity, unitsPerCase);
  if (!casesPerPallet || casesPerPallet <= 0) {
    return { fullPallets: 0, remainingCases: caseQuantity, unitsPerPallet: null, totalUnits };
  }
  return {
    fullPallets: Math.floor(caseQuantity / casesPerPallet),
    remainingCases: caseQuantity % casesPerPallet,
    unitsPerPallet: unitsPerCase * casesPerPallet,
    totalUnits,
  };
}

/**
 * Snap/clamp a requested case quantity to a valid, orderable value.
 * Enforces: integer, >= 0, >= minimumCases (when > 0), multiple of caseOrderStep,
 * and <= availableCases. Returns the largest valid quantity <= requested that
 * satisfies all constraints, or 0 when nothing is orderable.
 */
export function clampCaseQuantity(
  requested: number,
  packaging: Packaging,
  stockUnits: number | null | undefined,
): number {
  const step = Math.max(1, Math.floor(packaging.caseOrderStep || 1));
  const minCases = Math.max(0, Math.floor(packaging.minimumCases || 0));
  const maxCases = availableCases(stockUnits, packaging.unitsPerCase);

  if (!Number.isFinite(requested) || requested <= 0) return 0;
  let q = Math.floor(requested);

  // Snap down to the nearest multiple of step, honoring the minimum as a floor
  // that must itself be aligned to the step.
  const base = Math.max(minCases, step);
  if (q < base) {
    // Only allow the minimum if stock permits it; otherwise nothing is orderable.
    q = base;
  } else {
    // align to step
    q = Math.floor(q / step) * step;
    if (q < minCases) q = base;
  }

  if (q > maxCases) {
    // largest multiple of step <= maxCases, still >= minCases
    if (maxCases < minCases || maxCases < step) return 0;
    q = Math.floor(maxCases / step) * step;
  }
  return q > 0 ? q : 0;
}

/** Number of cases contained in exactly one palette (for "Ajouter 1 palette"). */
export function casesForOnePallet(casesPerPallet: number | null): number | null {
  if (!casesPerPallet || casesPerPallet <= 0) return null;
  return casesPerPallet;
}

// --------------------------- Minimum order (1 500 € HT) ---------------------

export interface MinimumOrderState {
  eligibleSubtotalHtCents: number;
  minimumHtCents: number;
  remainingHtCents: number; // 0 when reached
  progressRatio: number; // 0..1
  reached: boolean;
}

/**
 * Evaluate the order minimum against the NET HT subtotal (after discounts,
 * excl. VAT and shipping). This is the single gate used by both the UI and
 * the server-side validation.
 */
export function evaluateMinimumOrder(
  netSubtotalHtCents: number,
  minimumHtCents: number = ORDER_MINIMUM_HT_CENTS,
): MinimumOrderState {
  const subtotal = Math.max(0, Math.round(netSubtotalHtCents));
  const remaining = Math.max(0, minimumHtCents - subtotal);
  return {
    eligibleSubtotalHtCents: subtotal,
    minimumHtCents,
    remainingHtCents: remaining,
    progressRatio: minimumHtCents === 0 ? 1 : Math.min(1, subtotal / minimumHtCents),
    reached: subtotal >= minimumHtCents,
  };
}

// --------------------------- Price visibility (pro_valide) ------------------

export const PRICE_HIDDEN = 'N/D' as const;

/** Only PRO_VALIDE (and ADMIN) may see prices. */
export function canSeePrices(role: string | null | undefined): boolean {
  return role === 'PRO_VALIDE' || role === 'ADMIN';
}

// --------------------------- Formatting -------------------------------------

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEurFromCents(cents: number): string {
  return `${eurFormatter.format(cents / 100)} HT`;
}

/**
 * Price display helper. Returns N/D for non-pro users or when the price is
 * unknown, so callers never leak a real price to unauthorized viewers.
 */
export function displayPriceHt(
  cents: number | null | undefined,
  role: string | null | undefined,
): string {
  if (!canSeePrices(role) || cents == null) return PRICE_HIDDEN;
  return formatEurFromCents(cents);
}

// --------------------------- Internal ---------------------------------------

function assertPositiveInt(n: number, name: string): void {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a strictly positive integer, got ${n}`);
  }
}
