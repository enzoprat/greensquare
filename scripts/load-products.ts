/**
 * Idempotent loader: imports/generated/{brands.csv, products-import.csv} -> DB.
 *
 * Non-destructive & re-runnable: upserts brands by slug and products by handle
 * (falling back to sku). Existing products are UPDATED, never blindly replaced;
 * a product without a validated GS price or without valid packaging is forced to
 * DRAFT so it can never be published/ordered by accident.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prisma } from '../src/lib/prisma';
import { parseCsv } from '../src/lib/csv';

const OUT = join(process.cwd(), 'imports', 'generated');

function intOrNull(v: string): number | null {
  const s = (v ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

async function main() {
  const brandRows = parseCsv(await readFile(join(OUT, 'brands.csv'), 'utf8'));
  const productRows = parseCsv(await readFile(join(OUT, 'products-import.csv'), 'utf8'));

  const brandIdBySlug = new Map<string, string>();
  for (const b of brandRows) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, displayOrder: intOrNull(b.display_order) ?? 0, active: b.active === '1' },
      create: { slug: b.slug, name: b.name, displayOrder: intOrNull(b.display_order) ?? 0, active: b.active === '1' },
    });
    brandIdBySlug.set(b.slug, brand.id);
  }

  let created = 0, updated = 0, draft = 0;
  for (const p of productRows) {
    const brandId = brandIdBySlug.get(p.brand_slug);
    if (!brandId) continue;

    const unitsPerCase = intOrNull(p.units_per_case);
    const price = intOrNull(p.unit_price_ht_cents);
    // A product is only ACTIVE when it has a real price AND valid packaging.
    const status = price != null && unitsPerCase != null && unitsPerCase > 0 ? 'ACTIVE' : 'DRAFT';
    if (status === 'DRAFT') draft++;

    const gallery = p.image_gallery ? p.image_gallery.split('|').filter(Boolean) : [];
    const data = {
      title: p.title,
      brandId,
      category: p.category || null,
      sku: p.sku || null,
      shortDesc: p.short_description || null,
      description: p.description || null,
      imageUrl: p.image_main || null,
      galleryJson: JSON.stringify(gallery),
      unitPriceHtCents: price,
      stockUnits: intOrNull(p.stock_units),
      unitsPerCase,
      casesPerPallet: intOrNull(p.cases_per_pallet),
      caseOrderStep: intOrNull(p.case_order_step) ?? 1,
      minimumCases: intOrNull(p.minimum_cases) ?? 1,
      netWeightG: intOrNull(p.net_weight_g),
      storageType: p.storage_type || null,
      countryOrigin: p.country_of_origin || null,
      sourceUrl: p.source_url || null,
      status: status as 'ACTIVE' | 'DRAFT',
      lastImport: new Date(),
    };

    const existing = await prisma.product.findFirst({
      where: { OR: [{ handle: p.handle }, ...(p.sku ? [{ sku: p.sku }] : [])] },
      select: { id: true },
    });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data: { handle: p.handle, ...data } });
      created++;
    }
  }

  console.log('[load-products]', { brands: brandIdBySlug.size, created, updated, draft, total: productRows.length });
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('[load-products] fatal', e); await prisma.$disconnect(); process.exit(1); });
