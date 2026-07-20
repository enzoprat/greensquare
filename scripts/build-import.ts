/**
 * Build the generated import artifacts from the per-brand source CSVs.
 *
 *   imports/brands/{slug}/products-source.csv   (input, human-editable)
 *        -> imports/generated/products-master.csv    (full normalized view)
 *        -> imports/generated/products-import.csv     (load-ready rows)
 *        -> imports/generated/brands.csv
 *        -> imports/generated/import-errors.csv
 *        -> imports/generated/import-report.json
 *
 * Idempotent & non-destructive: pure file transform, no DB writes.
 * Matching keys (dedup order): SKU -> source_url -> handle -> brand+title.
 * Coherence rules (section 6): units_per_case is a strictly positive int;
 * cases_per_pallet positive int or empty; units_per_pallet = upc*cpp when both
 * present; unknown values stay EMPTY (never 0) and are flagged for manual work.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsv, toCsv } from '../src/lib/csv';
import { slugify } from '../src/lib/text';

const ROOT = join(process.cwd(), 'imports');
const BRANDS_DIR = join(ROOT, 'brands');
const OUT = join(ROOT, 'generated');

function posIntOrEmpty(v: string): { value: number | null; error?: string } {
  const s = (v ?? '').trim();
  if (s === '') return { value: null };
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) return { value: null, error: `not a positive integer: "${s}"` };
  return { value: n };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const brandSlugs = (await readdir(BRANDS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const master: Record<string, unknown>[] = [];
  const errors: { key: string; source_url: string; field: string; reason: string }[] = [];
  const dedup = new Map<string, string>(); // matchKey -> handle
  const brands = new Map<string, { slug: string; name: string; product_count: number }>();

  let found = 0;
  let duplicates = 0;

  for (const slug of brandSlugs) {
    const file = join(BRANDS_DIR, slug, 'products-source.csv');
    let text: string;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    const rows = parseCsv(text);

    for (const r of rows) {
      found++;
      const matchKey =
        (r.sku && `sku:${r.sku}`) ||
        (r.source_url && `url:${r.source_url}`) ||
        (r.handle && `handle:${slugify(r.handle)}`) ||
        `bt:${r.brand_slug}|${r.title_normalized}`;

      if (dedup.has(matchKey)) { duplicates++; continue; }
      dedup.set(matchKey, r.handle);

      const upc = posIntOrEmpty(r.units_per_case);
      const cpp = posIntOrEmpty(r.cases_per_pallet);
      if (upc.error) errors.push({ key: matchKey, source_url: r.source_url, field: 'units_per_case', reason: upc.error });
      if (cpp.error) errors.push({ key: matchKey, source_url: r.source_url, field: 'cases_per_pallet', reason: cpp.error });

      const unitsPerPallet = upc.value != null && cpp.value != null ? upc.value * cpp.value : null;

      const bslug = r.brand_slug || 'sans-marque';
      const b = brands.get(bslug) ?? { slug: bslug, name: r.brand_name || 'Sans marque', product_count: 0 };
      b.product_count++;
      brands.set(bslug, b);

      // GS selling price is intentionally absent from source -> stays empty (DRAFT).
      const hasPrice = false;
      const hasPackaging = upc.value != null;
      const ready = hasPrice && hasPackaging && !!r.sku && !!r.image_main && bslug !== 'sans-marque';

      master.push({
        handle: r.handle,
        title: r.title,
        brand_slug: bslug,
        brand_name: r.brand_name,
        category: r.category,
        sku: r.sku,
        short_description: r.short_description,
        description: r.description,
        image_main: r.image_main,
        image_gallery: r.image_gallery,
        unit_price_ht_cents: '', // to be filled by Green Square
        source_price_ref_cents: r.source_price_ref_cents,
        stock_units: '', // to be filled by Green Square / EBP
        units_per_case: upc.value ?? '',
        cases_per_pallet: cpp.value ?? '',
        units_per_pallet: unitsPerPallet ?? '',
        case_order_step: r.case_order_step || '1',
        minimum_cases: r.minimum_cases || '1',
        net_weight_g: r.net_weight_g,
        storage_type: r.storage_type,
        country_of_origin: r.country_of_origin,
        source_url: r.source_url,
        status: ready ? 'ACTIVE' : 'DRAFT',
        needs_manual: ready ? '0' : '1',
        last_import: r.last_import,
      });
    }
  }

  // products-import.csv is the same set; loader decides ACTIVE/DRAFT from data.
  await writeFile(join(OUT, 'products-master.csv'), toCsv(master), 'utf8');
  await writeFile(join(OUT, 'products-import.csv'), toCsv(master), 'utf8');
  await writeFile(
    join(OUT, 'brands.csv'),
    toCsv([...brands.values()].map((b, i) => ({ slug: b.slug, name: b.name, display_order: i, active: '1', product_count: b.product_count }))),
    'utf8',
  );
  await writeFile(
    join(OUT, 'import-errors.csv'),
    toCsv(errors.length ? errors : [], ['key', 'source_url', 'field', 'reason']),
    'utf8',
  );

  const report = {
    generated_at: new Date().toISOString(),
    brands: brands.size,
    products_found: found,
    unique_products: master.length,
    duplicates_ignored: duplicates,
    without_brand: master.filter((m) => m.brand_slug === 'sans-marque').length,
    without_image: master.filter((m) => !m.image_main).length,
    without_sku: master.filter((m) => !m.sku).length,
    without_units_per_case: master.filter((m) => m.units_per_case === '').length,
    without_cases_per_pallet: master.filter((m) => m.cases_per_pallet === '').length,
    without_price: master.filter((m) => m.unit_price_ht_cents === '').length,
    ready_to_import: master.filter((m) => m.needs_manual === '0').length,
    needs_manual: master.filter((m) => m.needs_manual === '1').length,
    validation_errors: errors.length,
  };
  await writeFile(join(OUT, 'import-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('[build-import]', report);
}

main().catch((e) => { console.error('[build-import] fatal', e); process.exit(1); });
