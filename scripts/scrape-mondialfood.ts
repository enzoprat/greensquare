/**
 * Mondial Food product extractor (idempotent, re-runnable).
 *
 * Uses the PUBLIC WooCommerce Store API (/wp-json/wc/store/v1/products) which is
 * the clean, paginated, documented source — no HTML scraping, no auth bypass.
 * Only public data is captured. Source prices are recorded FOR REFERENCE ONLY
 * (into products-source.csv) and are NOT used as Green Square selling prices.
 * Packaging (units_per_case, cases_per_pallet…) does not exist in the source and
 * is left blank + flagged for manual completion. Nothing is invented.
 *
 * Output: imports/brands/{brand-slug}/products-source.csv  (one CSV per brand)
 *         imports/raw/mondialfood-raw.json                 (full raw snapshot)
 *
 * Matching keys used downstream (in order): SKU -> source URL -> handle -> brand+title.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { slugify, normalizeTitle, cleanSourceHtml, toPlainText, decodeEntities } from '../src/lib/text';
import { toCsv } from '../src/lib/csv';

const API = 'https://mondialfood.fr/wp-json/wc/store/v1/products';
const PER_PAGE = 100;
const DELAY_MS = 1200; // be gentle with the source server
const UA = 'GreenSquareImportBot/1.0 (authorized public-catalog sync)';
const ROOT = join(process.cwd(), 'imports');

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  prices?: { price?: string; currency_minor_unit?: number };
  images?: { src: string; alt?: string }[];
  categories?: { id: number; name: string; slug: string; link: string }[];
  is_in_stock?: boolean;
  low_stock_remaining?: number | null;
  stock_availability?: { text?: string };
}

interface SourceRow {
  source_id: string;
  source_url: string;
  handle: string;
  title: string;
  title_normalized: string;
  brand_slug: string;
  brand_name: string;
  category: string;
  sku: string;
  short_description: string;
  description: string;
  image_main: string;
  image_gallery: string;
  source_price_ref_cents: string; // reference only, NOT the GS price
  in_stock: string;
  // Packaging must be completed manually — emitted empty on purpose.
  units_per_case: string;
  cases_per_pallet: string;
  case_order_step: string;
  minimum_cases: string;
  net_weight_g: string;
  storage_type: string;
  country_of_origin: string;
  needs_manual: string;
  last_import: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page: number): Promise<{ products: WooProduct[]; totalPages: number }> {
  const url = `${API}?per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '1');
  const products = (await res.json()) as WooProduct[];
  return { products, totalPages };
}

/**
 * Mondial Food encodes the brand as a category whose link contains
 * "/categorie-produit/marques/". The other category is the real product category.
 */
function splitBrandAndCategory(cats: WooProduct['categories']) {
  let brand: { name: string; slug: string } | null = null;
  let category = '';
  for (const c of cats ?? []) {
    if (/\/marques\//i.test(c.link)) {
      if (!brand) brand = { name: decodeEntities(c.name).replace(/!+$/, '').trim(), slug: slugify(c.slug || c.name) };
    } else if (!category) {
      category = decodeEntities(c.name);
    }
  }
  return { brand, category };
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[scrape] start ${startedAt}`);
  await mkdir(join(ROOT, 'raw'), { recursive: true });

  const raw: WooProduct[] = [];
  const errors: { source_id?: string; url?: string; reason: string }[] = [];

  // page 1 reveals totalPages
  let { products, totalPages } = await fetchPage(1);
  raw.push(...products);
  console.log(`[scrape] page 1/${totalPages}: ${products.length} products`);
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const r = await fetchPage(page);
      raw.push(...r.products);
      console.log(`[scrape] page ${page}/${totalPages}: ${r.products.length} products`);
    } catch (e) {
      errors.push({ reason: `page ${page}: ${(e as Error).message}` });
    }
  }

  await writeFile(join(ROOT, 'raw', 'mondialfood-raw.json'), JSON.stringify(raw, null, 2), 'utf8');

  // Deduplicate by source id, then group rows per brand.
  const seen = new Set<number>();
  const byBrand = new Map<string, { name: string; rows: SourceRow[] }>();

  for (const p of raw) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);

    const { brand, category } = splitBrandAndCategory(p.categories);
    const brandSlug = brand?.slug ?? 'sans-marque';
    const brandName = brand?.name ?? 'Sans marque';
    if (!brand) errors.push({ source_id: String(p.id), url: p.permalink, reason: 'no brand category' });

    const images = (p.images ?? []).map((i) => i.src).filter(Boolean);
    if (images.length === 0) errors.push({ source_id: String(p.id), url: p.permalink, reason: 'no image' });

    const priceRef = p.prices?.price ? String(p.prices.price) : ''; // minor units already (cents)

    const row: SourceRow = {
      source_id: String(p.id),
      source_url: p.permalink,
      handle: slugify(p.slug || p.name),
      title: decodeEntities(p.name).trim(),
      title_normalized: normalizeTitle(decodeEntities(p.name)),
      brand_slug: brandSlug,
      brand_name: brandName,
      category,
      sku: p.sku?.trim() ?? '',
      short_description: toPlainText(p.short_description || p.description, 300),
      description: cleanSourceHtml(p.description),
      image_main: images[0] ?? '',
      image_gallery: images.slice(1).join('|'),
      source_price_ref_cents: priceRef,
      in_stock: p.is_in_stock ? '1' : '0',
      units_per_case: '',
      cases_per_pallet: '',
      case_order_step: '',
      minimum_cases: '',
      net_weight_g: '',
      storage_type: '',
      country_of_origin: '',
      needs_manual: '1', // packaging + GS price always require manual completion
      last_import: startedAt,
    };

    const bucket = byBrand.get(brandSlug) ?? { name: brandName, rows: [] };
    bucket.rows.push(row);
    byBrand.set(brandSlug, bucket);
  }

  // Write one source CSV per brand.
  for (const [slug, { rows }] of byBrand) {
    const dir = join(ROOT, 'brands', slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'products-source.csv'), toCsv(rows as unknown as Record<string, unknown>[]), 'utf8');
  }

  // Scrape report.
  await mkdir(join(ROOT, 'generated'), { recursive: true });
  const report = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    pages_explored: totalPages,
    products_found: raw.length,
    unique_products: seen.size,
    duplicates_ignored: raw.length - seen.size,
    brands: byBrand.size,
    without_brand: errors.filter((e) => e.reason === 'no brand category').length,
    without_image: errors.filter((e) => e.reason === 'no image').length,
    errors,
  };
  await writeFile(join(ROOT, 'generated', 'scrape-report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('[scrape] done:', {
    products: report.unique_products,
    brands: report.brands,
    without_brand: report.without_brand,
    without_image: report.without_image,
  });
}

main().catch((e) => {
  console.error('[scrape] fatal', e);
  process.exit(1);
});
