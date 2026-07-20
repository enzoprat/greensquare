import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getBrands, getCatalog, getCategories, getMerchantBySlug, type CatalogFilters } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { BrandFilter } from '@/components/BrandFilter';

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) return { title: 'Marchand' };
  return {
    title: merchant.name,
    description: merchant.description ?? `Marques et produits ${merchant.name} sur Green Square, par colis et palette.`,
    alternates: { canonical: `/marchands/${slug}` },
  };
}

export default async function MerchantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();

  const merchant = await getMerchantBySlug(slug);
  if (!merchant || !merchant.active) notFound();

  const filters: CatalogFilters = {
    merchant: slug,
    q: str(sp.q) || undefined,
    brand: str(sp.brand) || undefined,
    category: str(sp.category) || undefined,
    storage: str(sp.storage) || undefined,
    availableOnly: str(sp.available) === '1',
    sort: (str(sp.sort) as CatalogFilters['sort']) || 'title',
  };

  const [brands, products, categories] = await Promise.all([
    getBrands(true, slug),
    getCatalog(filters, user?.role),
    getCategories(slug),
  ]);

  // Query string preserved by the brand filter (everything except brand itself).
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: filters.q, category: filters.category, storage: filters.storage, sort: str(sp.sort), available: str(sp.available) })) {
    if (v) base.set(k, String(v));
  }
  const hasFilters = !!(filters.q || filters.brand || filters.category || filters.storage || filters.availableOnly);

  return (
    <div className="container-gs py-8">
      <nav className="mb-4 text-sm text-ink-faint" aria-label="Fil d'Ariane">
        <a href="/" className="hover:text-brand">Accueil</a> / <span className="text-ink">{merchant.name}</span>
      </nav>

      <header className="card flex items-center gap-5 p-6">
        {merchant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.logoUrl} alt={merchant.name} className="max-h-16 object-contain" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-card bg-brand-light text-xl font-semibold text-brand">{merchant.name.slice(0, 2)}</span>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{merchant.name}</h1>
          {merchant.description ? <p className="mt-1 max-w-2xl text-sm text-ink-soft">{merchant.description}</p> : null}
          <p className="mt-1 text-sm text-ink-faint">{brands.length} marques · {products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
      </header>

      {/* Filtre par marque (logos) */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-ink-soft">Filtrer par marque</h2>
        <BrandFilter
          brands={brands.map((b) => ({ slug: b.slug, name: b.name, logoUrl: b.logoUrl }))}
          active={filters.brand}
          baseQuery={base}
          basePath={`/marchands/${slug}`}
        />
      </div>

      {/* Filtre par type de produit + recherche/tri (form GET => URL synchronisée). */}
      <form className="mt-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-white p-3" method="get">
        {filters.brand ? <input type="hidden" name="brand" value={filters.brand} /> : null}
        <div>
          <label className="label" htmlFor="q">Recherche</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Nom, SKU" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="category">Type de produit</label>
          <select id="category" name="category" defaultValue={filters.category ?? ''} className="field">
            <option value="">Tous</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="storage">Conservation</label>
          <select id="storage" name="storage" defaultValue={filters.storage ?? ''} className="field">
            <option value="">Toutes</option>
            <option value="ambient">Ambiant</option>
            <option value="chilled">Frais</option>
            <option value="frozen">Surgelé</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">Tri</label>
          <select id="sort" name="sort" defaultValue={str(sp.sort) ?? 'title'} className="field">
            <option value="title">Alphabétique</option>
            <option value="new">Nouveautés</option>
            <option value="price">Prix croissant</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="available" value="1" defaultChecked={filters.availableOnly} /> En stock</label>
        <button className="btn-primary" type="submit">Filtrer</button>
        {hasFilters ? <Link href={`/marchands/${slug}`} className="text-sm text-ink-faint hover:text-brand">Réinitialiser</Link> : null}
      </form>

      {products.length === 0 ? (
        <p className="py-16 text-center text-ink-faint">Aucun produit ne correspond à ces filtres.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
