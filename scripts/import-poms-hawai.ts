/**
 * Idempotent import of the "Poms & Hawai" merchant.
 *
 * Source: "BOISSONS POM'S et autres CSV" (supplier GARIDO). 4 brands grouped
 * into 2 order-groups that cannot be mixed within a single order:
 *   - "poms-hawai"        : Pom's + Hawai
 *   - "don-simon-rostoy"  : Don Simon + Rostoy
 *
 * Re-runnable: upserts merchant by slug, brands by slug, products by handle
 * (falling back to sku). Prices are per-unit HT. Zero-price lines are imported
 * at 0 € on purpose (to be priced later by the admin).
 */
import { prisma } from '../src/lib/prisma';
import { slugify } from '../src/lib/text';

type Row = {
  sku: string;
  title: string;
  priceEur: number; // per-unit HT in euros
  unitsPerCase: number;
  ean: string | null;
  brand: 'poms-hawai' | 'don-simon' | 'rostoy';
};

const MERCHANT = { slug: 'poms-hawai', name: 'Poms & Hawai' };

// Pom's and Hawai share the same product category -> one merged brand.
const BRANDS: { slug: string; name: string; orderGroupKey: string; displayOrder: number }[] = [
  { slug: 'poms-hawai', name: 'Poms & Hawai', orderGroupKey: 'poms-hawai', displayOrder: 0 },
  { slug: 'don-simon', name: 'Don Simon', orderGroupKey: 'don-simon-rostoy', displayOrder: 1 },
  { slug: 'rostoy', name: 'Rostoy', orderGroupKey: 'don-simon-rostoy', displayOrder: 2 },
];

// Slugs of legacy brands to fold into the merged "Poms & Hawai" brand, then delete.
const LEGACY_MERGED = ['poms', 'hawai'];

const ROWS: Row[] = [
  // Don Simon — Nectar 1,5 L PET (prix à 0 €, à compléter)
  { sku: '4369', title: 'Don Simon Nectar (Maracuya) Fruit de la Passion 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '3961', title: 'Don Simon Nectar Ananas 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '4368', title: 'Don Simon Nectar Ananas Coco 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '4370', title: 'Don Simon Nectar Mangue 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '3960', title: 'Don Simon Nectar Orange 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '3962', title: 'Don Simon Nectar Pêche 1,5 L PET (x6)', priceEur: 0, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  // Hawai — 1,50 L PET
  { sku: 'HAWANA150PETX6', title: 'HAWAI ANANAS 1,50 L PET (x6)', priceEur: 0.95, unitsPerCase: 6, ean: null, brand: 'poms-hawai' },
  { sku: 'HAWFR150PETX6', title: 'HAWAI FRAISE 1,50 L PET (x6)', priceEur: 0.95, unitsPerCase: 6, ean: null, brand: 'poms-hawai' },
  { sku: 'HAWOR150PETX6', title: 'HAWAI ORANGE 1,50 L PET (x6)', priceEur: 0.95, unitsPerCase: 6, ean: null, brand: 'poms-hawai' },
  { sku: 'HATR150PETX6', title: 'HAWAI TROPICAL 1,50 L PET (x6)', priceEur: 0.95, unitsPerCase: 6, ean: '3760301291152', brand: 'poms-hawai' },
  // Rostoy — Jus 1 L Amphore Verre
  { sku: '10031', title: 'Jus de Pomme Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'rostoy' },
  { sku: '10032', title: 'Jus de Raisin Blanc Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'rostoy' },
  { sku: '10109', title: 'Jus de Raisin Rouge Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'rostoy' },
  { sku: '11237', title: 'Nectar Ananas Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: '8410261775074', brand: 'rostoy' },
  // Don Simon — Canettes 330 ML Slim (fardeau 24)
  { sku: '18757', title: "Nectar d'ananas et de noix de coco 330 ML Canette Slim (4x6) Fardeau 24 Pcs", priceEur: 0.55, unitsPerCase: 24, ean: null, brand: 'don-simon' },
  { sku: '18758', title: 'Nectar de Mangue 330 ML Canette Slim (4x6) Fardeau 24 Pcs', priceEur: 0.55, unitsPerCase: 24, ean: null, brand: 'don-simon' },
  { sku: '10230', title: 'Nectar de Pêche 330 ML Canette Slim (4x6) Fardeau 24 Pcs', priceEur: 0.55, unitsPerCase: 24, ean: null, brand: 'don-simon' },
  // Don Simon — Nectar Disfruta 1 L Brique
  { sku: '1129', title: 'Nectar Disfruta Ananas 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '3193', title: 'Nectar Disfruta Mangue 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '3192', title: 'Nectar Disfruta Multifruit 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '1128', title: 'Nectar Disfruta Orange 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '1130', title: 'Nectar Disfruta Pêche 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '4973', title: 'Nectar Disfruta Pomme 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  { sku: '5289', title: 'Nectar Disfruta Tropical 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'don-simon' },
  // Rostoy — Nectar 1 L Amphore Verre
  { sku: '11235', title: 'Nectar Mangue Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: '8410261775272', brand: 'rostoy' },
  { sku: '11239', title: 'Nectar Multifruit Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: '8410261775098', brand: 'rostoy' },
  { sku: '11236', title: 'Nectar Orange Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: '8410261775067', brand: 'rostoy' },
  { sku: '11238', title: 'Nectar Pêche Rostoy 1 L Amphore Verre (x6)', priceEur: 1.25, unitsPerCase: 6, ean: '8410261775081', brand: 'rostoy' },
  // Pom's — 1,50 L PET
  { sku: 'POMS150PETX6', title: "POM'S 1,50 L PET (x6)", priceEur: 0.95, unitsPerCase: 6, ean: '3760301291190', brand: 'poms-hawai' },
  // Don Simon — Simon Life 1,5 L PET
  { sku: '1304', title: 'Simon Life Fraise 1,5 L PET (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '1305', title: 'Simon Life Mandarine 1,50 L PET (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '10231', title: 'Simon Life Mango L PET (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  { sku: '1303', title: 'Simon Life Orange 1,5 L PET (x6)', priceEur: 1.25, unitsPerCase: 6, ean: null, brand: 'don-simon' },
  // Rostoy — Nectar Rostoy Disfruta 1 L Brique
  { sku: '69999', title: 'Nectar Rostoy Disfruta Ananas (40% fruit) 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'rostoy' },
  { sku: '909', title: 'Nectar Rostoy Disfruta Mangue (25% fruit) 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'rostoy' },
  { sku: '10024', title: 'Nectar Rostoy Disfruta Orange (40% fruit) 1L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'rostoy' },
  { sku: '4661', title: 'Nectar Rostoy Disfruta Pêche (50% fruit) 1L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'rostoy' },
  { sku: '6958', title: 'Nectar Rostoy Disfruta Tropical (50% fruit) 1 L Brique (x12)', priceEur: 0.9, unitsPerCase: 12, ean: null, brand: 'rostoy' },
];

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { slug: MERCHANT.slug },
    update: { name: MERCHANT.name },
    create: { slug: MERCHANT.slug, name: MERCHANT.name, displayOrder: 1 },
  });

  const brandIdBySlug = new Map<string, string>();
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, merchantId: merchant.id, orderGroupKey: b.orderGroupKey, displayOrder: b.displayOrder, active: true },
      create: { slug: b.slug, name: b.name, merchantId: merchant.id, orderGroupKey: b.orderGroupKey, displayOrder: b.displayOrder, active: true },
    });
    brandIdBySlug.set(b.slug, brand.id);
  }

  let created = 0, updated = 0;
  for (const r of ROWS) {
    const brandId = brandIdBySlug.get(r.brand)!;
    const handle = slugify(`${r.title}-${r.sku}`);
    const data = {
      title: r.title,
      brandId,
      sku: r.sku,
      ean: r.ean,
      unitPriceHtCents: Math.round(r.priceEur * 100),
      unitsPerCase: r.unitsPerCase,
      storageType: 'ambient',
      status: 'ACTIVE' as const,
      lastImport: new Date(),
    };
    const existing = await prisma.product.findFirst({
      where: { OR: [{ handle }, { sku: r.sku }] },
      select: { id: true },
    });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data: { handle, ...data } });
      created++;
    }
  }

  // Fold any legacy split brands (Pom's, Hawai) into the merged brand, then
  // remove the now-empty legacy brands. No-op after the first run.
  const mergedId = brandIdBySlug.get('poms-hawai')!;
  let moved = 0;
  for (const slug of LEGACY_MERGED) {
    const legacy = await prisma.brand.findUnique({ where: { slug } });
    if (!legacy || legacy.id === mergedId) continue;
    const res = await prisma.product.updateMany({ where: { brandId: legacy.id }, data: { brandId: mergedId } });
    moved += res.count;
    await prisma.brand.delete({ where: { id: legacy.id } });
  }

  console.log('[import-poms-hawai]', { merchant: merchant.slug, brands: brandIdBySlug.size, created, updated, moved, total: ROWS.length });
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('[import-poms-hawai] fatal', e); await prisma.$disconnect(); process.exit(1); });
