import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getBrands, getCatalog, getCategories, type CatalogFilters } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { BrandFilter } from '@/components/BrandFilter';

export const metadata: Metadata = {
  title: 'Catalogue',
  description: 'Catalogue B2B agroalimentaire : filtrez par marque, catégorie et conservation. Commande par colis et palette.',
};

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CataloguePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  const filters: CatalogFilters = {
    q: str(sp.q) || undefined,
    merchant: str(sp.merchant) || undefined,
    brand: str(sp.brand) || undefined,
    category: str(sp.category) || undefined,
    storage: str(sp.storage) || undefined,
    availableOnly: str(sp.available) === '1',
    sort: (str(sp.sort) as CatalogFilters['sort']) || 'title',
  };

  const [brands, products, categories] = await Promise.all([
    getBrands(true, filters.merchant),
    getCatalog(filters, user?.role),
    getCategories(filters.merchant),
  ]);

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: filters.q, merchant: filters.merchant, category: filters.category, storage: filters.storage, sort: str(sp.sort), available: str(sp.available) })) {
    if (v) base.set(k, String(v));
  }
  const hasFilters = !!(filters.q || filters.brand || filters.category || filters.storage || filters.availableOnly);

  return (
    <div className="container-gs py-6">
      <h1 className="text-2xl font-semibold">Catalogue</h1>
      <p className="mt-1 text-sm text-ink-soft">{products.length} produit{products.length > 1 ? 's' : ''}{filters.brand ? ` · marque ${filters.brand}` : ''}</p>

      <div className="mt-4">
        <BrandFilter brands={brands.map((b) => ({ slug: b.slug, name: b.name, logoUrl: b.logoUrl }))} active={filters.brand} baseQuery={base} />
      </div>

      {/* Filtres secondaires — form GET => URL synchronisée, indexable. */}
      <form className="mt-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-white p-3" method="get">
        {filters.merchant ? <input type="hidden" name="merchant" value={filters.merchant} /> : null}
        {filters.brand ? <input type="hidden" name="brand" value={filters.brand} /> : null}
        <div>
          <label className="label" htmlFor="q">Recherche</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Nom, SKU, marque" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="category">Catégorie</label>
          <select id="category" name="category" defaultValue={filters.category ?? ''} className="field">
            <option value="">Toutes</option>
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
        {hasFilters ? <Link href="/catalogue" className="text-sm text-ink-faint hover:text-brand">Réinitialiser</Link> : null}
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
