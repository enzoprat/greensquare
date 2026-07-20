/**
 * Server-side product serialization. This is the ONLY place products are turned
 * into data sent to the client. Prices are stripped entirely for non-pro users
 * so a real price can never leak into HTML/JSON/data attributes.
 */
import type { Product, Brand } from '@prisma/client';
import { canSeePrices, displayPriceHt, availableCases, hasValidPackaging, PRICE_HIDDEN } from './b2b';

export interface PublicProduct {
  id: string;
  handle: string;
  title: string;
  brand: { slug: string; name: string; logoUrl: string | null };
  category: string | null;
  sku: string | null;
  imageUrl: string | null;
  gallery: string[];
  shortDesc: string | null;
  description: string | null;
  storageType: string | null;
  countryOrigin: string | null;
  netWeightG: number | null;

  unitsPerCase: number | null;
  casesPerPallet: number | null;
  caseOrderStep: number;
  minimumCases: number;

  stockUnits: number | null;
  availableCases: number | null; // null when packaging unknown

  // Price fields ONLY present for authorized viewers.
  canSeePrice: boolean;
  unitPriceHtCents: number | null; // null unless authorized
  casePriceHtCents: number | null;
  displayCasePrice: string; // "126,00 € HT" or "N/D"
  orderable: boolean;
}

type WithBrand = Product & { brand: Brand };

export function toPublicProduct(p: WithBrand, role: string | null | undefined): PublicProduct {
  const allowed = canSeePrices(role);
  const validPack = hasValidPackaging(p.unitsPerCase);
  const avail = validPack ? availableCases(p.stockUnits, p.unitsPerCase!) : null;
  const casePrice = allowed && p.unitPriceHtCents != null && validPack
    ? p.unitPriceHtCents * p.unitsPerCase!
    : null;

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    brand: { slug: p.brand.slug, name: p.brand.name, logoUrl: p.brand.logoUrl },
    category: p.category,
    sku: p.sku,
    imageUrl: p.imageUrl,
    gallery: safeJsonArray(p.galleryJson),
    shortDesc: p.shortDesc,
    description: p.description,
    storageType: p.storageType,
    countryOrigin: p.countryOrigin,
    netWeightG: p.netWeightG,
    unitsPerCase: p.unitsPerCase,
    casesPerPallet: p.casesPerPallet,
    caseOrderStep: p.caseOrderStep,
    minimumCases: p.minimumCases,
    stockUnits: p.stockUnits,
    availableCases: avail === Infinity ? null : avail,
    canSeePrice: allowed,
    unitPriceHtCents: allowed ? p.unitPriceHtCents : null,
    casePriceHtCents: casePrice,
    displayCasePrice: allowed ? displayPriceHt(casePrice, role) : PRICE_HIDDEN,
    orderable: p.status === 'ACTIVE' && validPack && (avail === null || avail === Infinity || (avail ?? 0) > 0),
  };
}

function safeJsonArray(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
}
