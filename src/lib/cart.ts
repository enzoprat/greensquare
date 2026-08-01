/**
 * Server-side cart. The server is the source of truth: every quantity is
 * re-clamped here against packaging + stock (section 17), so a tampered client
 * cannot inject invalid quantities. Prices are only ever computed/returned for
 * pro_valide users.
 */
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import {
  clampCaseQuantity,
  packagingOf,
  lineTotalHtCents,
  casePriceHtCents,
  unitsFromCases,
  paletteBreakdown,
  evaluateMinimumOrder,
  canSeePrices,
  displayPriceHt,
  hasValidPackaging,
  ORDER_MINIMUM_HT_CENTS,
  PRICE_HIDDEN,
} from './b2b';

const CART_COOKIE = 'gs_cart';

async function getCartToken(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;
  if (!token) {
    token = randomBytes(24).toString('hex');
    jar.set(CART_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 60 });
  }
  return token;
}

export async function getOrCreateCart(userId?: string | null) {
  const token = await getCartToken();
  const cart = await prisma.cart.upsert({
    where: { token },
    update: userId ? { userId } : {},
    create: { token, userId: userId ?? null },
    include: { items: { include: { product: { include: { brand: true } } } } },
  });
  return cart;
}

/** Add (accumulate) cases to a line, re-clamped server-side. */
export async function addToCart(productId: string, cases: number, userId?: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== 'ACTIVE' || !hasValidPackaging(product.unitsPerCase)) {
    throw new Error('Produit non commandable.');
  }
  // "add" accumulates a positive delta only. A non-positive delta is a no-op
  // (use "set" to reduce/remove). Prevents adversarial negative deltas from
  // silently emptying a line.
  if (!Number.isFinite(cases) || cases <= 0) return;
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => i.productId === productId);
  const requested = (existing?.caseQuantity ?? 0) + cases;
  const clamped = clampCaseQuantity(requested, packagingOf(product), product.stockUnits);

  if (clamped <= 0) {
    if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
    return;
  }
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { caseQuantity: clamped, unitsPerCase: product.unitsPerCase! },
    create: { cartId: cart.id, productId, caseQuantity: clamped, unitsPerCase: product.unitsPerCase! },
  });
}

/** Set an absolute case quantity (0 removes), re-clamped server-side. */
export async function setCartItem(productId: string, cases: number, userId?: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !hasValidPackaging(product.unitsPerCase)) throw new Error('Produit invalide.');
  const cart = await getOrCreateCart(userId);
  const clamped = clampCaseQuantity(cases, packagingOf(product), product.stockUnits);
  const existing = cart.items.find((i) => i.productId === productId);
  if (clamped <= 0) {
    if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
    return;
  }
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { caseQuantity: clamped, unitsPerCase: product.unitsPerCase! },
    create: { cartId: cart.id, productId, caseQuantity: clamped, unitsPerCase: product.unitsPerCase! },
  });
}

export async function removeCartItem(productId: string, userId?: string | null) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

export interface CartLineView {
  productId: string;
  handle: string;
  title: string;
  brandSlug: string;
  brandName: string;
  sku: string | null;
  imageUrl: string | null;
  caseQuantity: number;
  unitsPerCase: number;
  totalUnits: number;
  casesPerPallet: number | null;
  fullPallets: number;
  remainingCases: number;
  displayCasePrice: string;
  displayLineTotal: string;
  lineTotalHtCents: number | null; // null for non-pro
}

export interface CartView {
  lineCount: number;
  totalCases: number;
  byBrand: { brandSlug: string; brandName: string; lines: CartLineView[] }[];
  canSeePrice: boolean;
  subtotalHtCents: number | null;
  displaySubtotal: string;
  minimum: {
    minimumHtCents: number;
    remainingHtCents: number | null;
    progressRatio: number;
    reached: boolean;
    displayRemaining: string;
  };
  checkoutAllowed: boolean;
  blockReason: string | null;
}

type CartWithItems = Awaited<ReturnType<typeof getOrCreateCart>>;

/**
 * Order-group rule: some merchants split their brands into groups that cannot
 * be mixed in one order (e.g. Poms & Hawai: "Poms+Hawai" vs "Don Simon+Rostoy").
 * Brands with a null orderGroupKey are unconstrained. A cart is in conflict as
 * soon as it holds products from two or more distinct non-null group keys.
 */
function orderGroupConflict(cart: CartWithItems): { conflict: boolean; message: string | null } {
  const groups = new Map<string, Set<string>>(); // key -> brand names present
  for (const item of cart.items) {
    const key = item.product.brand.orderGroupKey;
    if (!key) continue;
    const names = groups.get(key) ?? new Set<string>();
    names.add(item.product.brand.name);
    groups.set(key, names);
  }
  if (groups.size < 2) return { conflict: false, message: null };
  const labels = [...groups.values()].map((s) => [...s].join(' + '));
  return {
    conflict: true,
    message: `Une commande ne peut pas mélanger ces groupes : ${labels.join(' / ')}. Merci de passer une commande distincte pour chacun.`,
  };
}

/** Build the view sent to the client. Prices only for pro_valide. */
export function buildCartView(cart: CartWithItems, role: string | null | undefined): CartView {
  const allowed = canSeePrices(role);
  const lines: CartLineView[] = [];
  let subtotal = 0;
  let totalCases = 0;

  for (const item of cart.items) {
    const p = item.product;
    const upc = item.unitsPerCase;
    const pallet = paletteBreakdown(item.caseQuantity, upc, p.casesPerPallet);
    const lineTotal = allowed && p.unitPriceHtCents != null
      ? lineTotalHtCents(p.unitPriceHtCents, upc, item.caseQuantity)
      : null;
    const casePrice = allowed && p.unitPriceHtCents != null ? casePriceHtCents(p.unitPriceHtCents, upc) : null;
    if (lineTotal != null) subtotal += lineTotal;
    totalCases += item.caseQuantity;

    lines.push({
      productId: p.id,
      handle: p.handle,
      title: p.title,
      brandSlug: p.brand.slug,
      brandName: p.brand.name,
      sku: p.sku,
      imageUrl: p.imageUrl,
      caseQuantity: item.caseQuantity,
      unitsPerCase: upc,
      totalUnits: unitsFromCases(item.caseQuantity, upc),
      casesPerPallet: p.casesPerPallet,
      fullPallets: pallet.fullPallets,
      remainingCases: pallet.remainingCases,
      displayCasePrice: allowed ? displayPriceHt(casePrice, role) : PRICE_HIDDEN,
      displayLineTotal: allowed ? displayPriceHt(lineTotal, role) : PRICE_HIDDEN,
      lineTotalHtCents: lineTotal,
    });
  }

  const byBrandMap = new Map<string, { brandSlug: string; brandName: string; lines: CartLineView[] }>();
  for (const l of lines) {
    const g = byBrandMap.get(l.brandSlug) ?? { brandSlug: l.brandSlug, brandName: l.brandName, lines: [] };
    g.lines.push(l);
    byBrandMap.set(l.brandSlug, g);
  }

  const min = evaluateMinimumOrder(subtotal, ORDER_MINIMUM_HT_CENTS);
  const empty = cart.items.length === 0;
  const groupCheck = orderGroupConflict(cart);
  let blockReason: string | null = null;
  if (!allowed) blockReason = 'Connectez-vous avec un compte professionnel validé pour commander.';
  else if (empty) blockReason = 'Votre panier est vide.';
  else if (groupCheck.conflict) blockReason = groupCheck.message;
  else if (!min.reached) blockReason = `Ajoutez encore ${formatEur(min.remainingHtCents)} HT pour atteindre le minimum de commande.`;

  return {
    lineCount: cart.items.length,
    totalCases,
    byBrand: [...byBrandMap.values()],
    canSeePrice: allowed,
    subtotalHtCents: allowed ? subtotal : null,
    displaySubtotal: allowed ? displayPriceHt(subtotal, role) : PRICE_HIDDEN,
    minimum: {
      minimumHtCents: min.minimumHtCents,
      remainingHtCents: allowed ? min.remainingHtCents : null,
      progressRatio: allowed ? min.progressRatio : 0,
      reached: allowed && min.reached,
      displayRemaining: allowed ? formatEur(min.remainingHtCents) + ' HT' : PRICE_HIDDEN,
    },
    checkoutAllowed: allowed && !empty && min.reached && !groupCheck.conflict,
    blockReason,
  };
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/**
 * Authoritative server-side checkout gate (section 17). Re-validates minimum,
 * pro status, packaging multiples and stock. Never trust the client.
 */
export async function validateCheckout(userRole: string | null | undefined, userId?: string | null) {
  if (!canSeePrices(userRole)) {
    return { ok: false as const, message: 'Compte professionnel validé requis pour commander.' };
  }
  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) return { ok: false as const, message: 'Panier vide.' };

  const groupCheck = orderGroupConflict(cart);
  if (groupCheck.conflict) return { ok: false as const, message: groupCheck.message! };

  let subtotal = 0;
  for (const item of cart.items) {
    const p = item.product;
    if (!hasValidPackaging(p.unitsPerCase) || p.unitPriceHtCents == null || p.status !== 'ACTIVE') {
      return { ok: false as const, message: `Produit non commandable: ${p.title}.` };
    }
    // quantity must be a valid, orderable multiple
    const clamped = clampCaseQuantity(item.caseQuantity, packagingOf(p), p.stockUnits);
    if (clamped !== item.caseQuantity) {
      return { ok: false as const, message: `Quantité invalide pour ${p.title} (colisage / stock).` };
    }
    subtotal += lineTotalHtCents(p.unitPriceHtCents, item.unitsPerCase, item.caseQuantity);
  }

  const min = evaluateMinimumOrder(subtotal);
  if (!min.reached) {
    return {
      ok: false as const,
      message: `Le montant minimum d'une commande professionnelle est de ${formatEur(min.minimumHtCents)} HT. Ajoutez encore ${formatEur(min.remainingHtCents)} HT de produits pour poursuivre.`,
    };
  }
  return { ok: true as const, subtotalHtCents: subtotal };
}
