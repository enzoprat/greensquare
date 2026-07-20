import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
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

// Merchants (marchands) that have at least one active product, for the home page.
export async function getMerchants() {
  const merchants = await prisma.merchant.findMany({
    where: { active: true },
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
  const brands = await prisma.brand.findMany({
    where: {
      active: true,
      slug: { not: 'sans-marque' },
      ...(merchantSlug ? { merchant: { slug: merchantSlug } } : {}),
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: withCounts ? { _count: { select: { products: { where: { status: 'ACTIVE' } } } } } : undefined,
  });
  return brands.filter((b) => !withCounts || (b as { _count?: { products: number } })._count!.products > 0);
}

export async function getCatalog(filters: CatalogFilters, role: string | null | undefined): Promise<PublicProduct[]> {
  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
  if (filters.merchant) where.brand = { merchant: { slug: filters.merchant } };
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
  return toPublicProduct(p, role);
}

export async function getCategories(merchantSlug?: string): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      category: { not: null },
      ...(merchantSlug ? { brand: { merchant: { slug: merchantSlug } } } : {}),
    },
    select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category!).filter(Boolean);
}
