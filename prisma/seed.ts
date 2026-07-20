/**
 * Demo seed. IMPORTANT: the packaging and prices set here are DEMO PLACEHOLDERS
 * so the catalog, cart and B2B flows can be exercised end-to-end. They are NOT
 * real Green Square data. Real values must be entered manually / via EBP before
 * go-live (see IMPLEMENTATION_LOG.md "Données manuelles requises").
 *
 * Also creates three test accounts (admin / pro_valide / visitor).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// A few plausible packaging profiles cycled across the demo sample.
const PROFILES = [
  { unitsPerCase: 20, casesPerPallet: 24, priceCents: 630, step: 1, min: 1, storage: 'frozen' },
  { unitsPerCase: 12, casesPerPallet: 40, priceCents: 1499, step: 1, min: 1, storage: 'ambient' },
  { unitsPerCase: 6, casesPerPallet: 60, priceCents: 2890, step: 1, min: 2, storage: 'chilled' },
  { unitsPerCase: 10, casesPerPallet: null, priceCents: 990, step: 1, min: 1, storage: 'frozen' },
  { unitsPerCase: 24, casesPerPallet: 30, priceCents: 450, step: 5, min: 5, storage: 'ambient' },
];

// Local logo files downloaded from mondialfood.fr into /public/brands.
// Brands without a known logo fall back to their name (text) in the UI.
const BRAND_LOGOS: Record<string, string> = {
  bladi: '/brands/bladi.png',
  'agro-aguiar': '/brands/agro-aguiar.png',
  findus: '/brands/findus.png',
  fripozo: '/brands/fripozo.png',
  ja: '/brands/ja.png',
  'la-nina-del-sur': '/brands/la-nina-del-sur.png',
  darta: '/brands/darta.png',
  wao: '/brands/wao.png',
  poppies: '/brands/poppies.png',
  turka: '/brands/turka.png',
  'tip-top': '/brands/tip-top.png',
  mexifood: '/brands/mexifood.png',
};

async function main() {
  const password = await bcrypt.hash('greensquare', 10);

  // Merchant (marchand) "Mondial Food" — top level of the catalogue. All the
  // scraped brands (Bladi, Findus, Darta...) belong to it. Others will be added
  // later; for now we only test with Mondial Food.
  const mondialFood = await prisma.merchant.upsert({
    where: { slug: 'mondial-food' },
    update: { logoUrl: '/merchants/mondial-food.png' },
    create: {
      slug: 'mondial-food',
      name: 'Mondial Food',
      logoUrl: '/merchants/mondial-food.png',
      description: 'Grossiste multi-marques : surgelés, snacks, pâtisseries et spécialités du monde.',
      website: 'https://www.mondialfood.fr',
      displayOrder: 0,
    },
  });

  // Attach every existing brand to Mondial Food and apply its real logo.
  const allBrands = await prisma.brand.findMany();
  for (const b of allBrands) {
    await prisma.brand.update({
      where: { id: b.id },
      data: {
        merchantId: mondialFood.id,
        logoUrl: BRAND_LOGOS[b.slug] ?? b.logoUrl,
      },
    });
  }
  await prisma.user.upsert({
    where: { email: 'admin@greensquare.eu' },
    update: {},
    create: { email: 'admin@greensquare.eu', passwordHash: password, role: 'ADMIN', firstName: 'Admin', lastName: 'GS' },
  });
  await prisma.user.upsert({
    where: { email: 'pro@greensquare.eu' },
    update: { role: 'PRO_VALIDE' },
    create: { email: 'pro@greensquare.eu', passwordHash: password, role: 'PRO_VALIDE', companyName: 'Distri Test SARL', firstName: 'Pro', lastName: 'Client' },
  });
  await prisma.user.upsert({
    where: { email: 'visiteur@greensquare.eu' },
    update: { role: 'VISITOR' },
    create: { email: 'visiteur@greensquare.eu', passwordHash: password, role: 'VISITOR', firstName: 'Visiteur', lastName: 'Test' },
  });

  // Enrich the WHOLE Mondial Food catalogue with DEMO packaging/prices so every
  // product is ACTIVE and orderable end-to-end (including the "sans-marque"
  // bucket that still needs manual re-branding).
  // (These values are placeholders — real data comes from EBP before go-live.)
  const products = await prisma.product.findMany({
    where: { brand: { merchant: { slug: 'mondial-food' } } },
    orderBy: { createdAt: 'asc' },
  });

  let i = 0;
  for (const p of products) {
    const prof = PROFILES[i % PROFILES.length];
    await prisma.product.update({
      where: { id: p.id },
      data: {
        unitPriceHtCents: prof.priceCents,
        unitsPerCase: prof.unitsPerCase,
        casesPerPallet: prof.casesPerPallet,
        caseOrderStep: prof.step,
        minimumCases: prof.min,
        storageType: prof.storage,
        stockUnits: prof.unitsPerCase * (10 + (i % 7)) + (i % prof.unitsPerCase), // non-round stock on purpose
        sku: p.sku ?? `DEMO-${p.id.slice(-10).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    i++;
  }

  const active = await prisma.product.count({ where: { status: 'ACTIVE' } });
  console.log(`[seed] users: admin/pro/visiteur (pwd: greensquare). Active demo products: ${active}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
