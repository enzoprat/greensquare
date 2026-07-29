import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getCurrentUser } from './auth';
import { toPublicProduct, type PublicProduct } from './product-dto';

export interface CatalogFilters {
  q?: string;
  merchant?: string;
  brand?: string;
  category?: string;
  storage?: string;
  sort?: 'title' | 'new' | 'price';
  availableOnly?: boolean;
}

/**
 * Per-client merchant allowlist. A validated client (PRO_VALIDE) sees ONLY the
 * mandants explicitly granted to them (default: none). Public visitors and
 * admins are unrestricted (public shopfront / full access).
 * Returns a Merchant where-fragment, or null when there is no restriction.
 */
async function visibleMerchantFilter(): Promise<Prisma.MerchantWhereInput | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'PRO_VALIDE') return null;
  const access = await prisma.clientMerchantAccess.findMany({
    where: { userId: user.id, visible: true },
    select: { merchantId: true },
  });
  return { id: { in: access.map((a) => a.merchantId) } };
}

// Merchants (marchands) that have at least one active product, for the home page.
export async function getMerchants() {
  const mFilter = await visibleMerchantFilter();
  const merchants = await prisma.merchant.findMany({
    where: { active: true, ...(mFilter ?? {}) },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      brands: { select: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } } },
    },
  });
  return merchants
    .map((m) => ({
      ...m,
      // Count only brands that actually have active products (matches the
      // merchant page, which lists those brands).
      brandCount: m.brands.filter((b) => b._count.products > 0).length,
      productCount: m.brands.reduce((n, b) => n + b._count.products, 0),
    }))
    .filter((m) => m.productCount > 0);
}

export async function getMerchantBySlug(slug: string) {
  return prisma.merchant.findUnique({ where: { slug } });
}

// Brands, optionally scoped to one merchant. Only brands with active products.
export async function getBrands(withCounts = true, merchantSlug?: string) {
  const mFilter = await visibleMerchantFilter();
  const brands = await prisma.brand.findMany({
    where: {
      active: true,
      slug: { not: 'sans-marque' },
      ...(merchantSlug || mFilter ? { merchant: { ...(merchantSlug ? { slug: merchantSlug } : {}), ...(mFilter ?? {}) } } : {}),
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: withCounts ? { _count: { select: { products: { where: { status: 'ACTIVE' } } } } } : undefined,
  });
  return brands.filter((b) => !withCounts || (b as { _count?: { products: number } })._count!.products > 0);
}

export async function getCatalog(filters: CatalogFilters, role: string | null | undefined): Promise<PublicProduct[]> {
  const mFilter = await visibleMerchantFilter();
  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
  if (filters.merchant || mFilter) {
    where.brand = { merchant: { ...(filters.merchant ? { slug: filters.merchant } : {}), ...(mFilter ?? {}) } };
  }
  if (filters.brand) where.brand = { ...(where.brand as object), slug: filters.brand };
  if (filters.category) where.category = filters.category;
  if (filters.storage) where.storageType = filters.storage;
  if (filters.availableOnly) where.stockUnits = { gt: 0 };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { sku: { contains: filters.q } },
      { brand: { name: { contains: filters.q } } },
    ];
  }
  // Price sort only meaningful for pro users; still deterministic otherwise.
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === 'new' ? { createdAt: 'desc' }
    : filters.sort === 'price' ? { unitPriceHtCents: 'asc' }
    : { title: 'asc' };

  const products = await prisma.product.findMany({ where, orderBy, include: { brand: true }, take: 200 });
  return products.map((p) => toPublicProduct(p, role));
}

export async function getProductByHandle(handle: string, role: string | null | undefined) {
  const p = await prisma.product.findUnique({ where: { handle }, include: { brand: true } });
  if (!p || p.status !== 'ACTIVE') return null;
  // Enforce per-client merchant allowlist on the product detail page too.
  const mFilter = await visibleMerchantFilter();
  if (mFilter) {
    const allowedIds = ((mFilter.id as { in?: string[] })?.in) ?? [];
    if (!p.brand.merchantId || !allowedIds.includes(p.brand.merchantId)) return null;
  }
  return toPublicProduct(p, role);
}

export async function getCategories(merchantSlug?: string): Promise<string[]> {
  const mFilter = await visibleMerchantFilter();
  const rows = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      category: { not: null },
      ...(merchantSlug || mFilter ? { brand: { merchant: { ...(merchantSlug ? { slug: merchantSlug } : {}), ...(mFilter ?? {}) } } } : {}),
    },
    select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category!).filter(Boolean);
}
