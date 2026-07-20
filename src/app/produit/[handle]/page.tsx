import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProductByHandle, getCatalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { CaseSelector } from '@/components/CaseSelector';

const STORAGE_LABEL: Record<string, string> = { frozen: 'Surgelé', chilled: 'Frais', ambient: 'Ambiant' };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProductByHandle(handle, null);
  if (!p) return { title: 'Produit' };
  return {
    title: p.title,
    description: p.shortDesc ?? `${p.title} — ${p.brand.name}. Disponible par colis sur Green Square.`,
    alternates: { canonical: `/produit/${handle}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getCurrentUser();
  const p = await getProductByHandle(handle, user?.role);
  if (!p) notFound();

  const related = (await getCatalog({ brand: p.brand.slug }, user?.role)).filter((x) => x.id !== p.id).slice(0, 4);
  const unitsPerPallet = p.unitsPerCase && p.casesPerPallet ? p.unitsPerCase * p.casesPerPallet : null;

  // Structured data (SEO). Never expose real price to non-pro: omit offers price.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    brand: { '@type': 'Brand', name: p.brand.name },
    sku: p.sku ?? undefined,
    image: p.imageUrl ?? undefined,
    description: p.shortDesc ?? undefined,
  };

  return (
    <div className="container-gs py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-4 text-sm text-ink-faint" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-brand">Accueil</Link> / <Link href="/catalogue" className="hover:text-brand">Catalogue</Link> / <Link href={`/marques/${p.brand.slug}`} className="hover:text-brand">{p.brand.name}</Link> / <span className="text-ink">{p.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card grid place-items-center bg-white p-6">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt={p.title} className="max-h-96 object-contain" />
          ) : <div className="text-ink-faint">Sans image</div>}
        </div>

        <div>
          <Link href={`/marques/${p.brand.slug}`} className="badge">{p.brand.name}</Link>
          <h1 className="mt-2 text-2xl font-semibold">{p.title}</h1>
          {p.sku ? <p className="mt-1 text-sm text-ink-faint">Réf. {p.sku}</p> : null}
          <p className="mt-3 text-lg font-semibold">
            {p.displayCasePrice}{p.canSeePrice ? <span className="ml-1 text-sm font-normal text-ink-faint">/ colis</span> : null}
          </p>
          {!p.canSeePrice ? (
            <p className="mt-1 text-sm text-ink-soft">Les tarifs sont réservés aux comptes professionnels validés. <Link href="/compte/demande-pro" className="text-brand hover:underline">Ouvrir un compte</Link>.</p>
          ) : null}

          {/* Bloc logistique — valeurs calculées, jamais écrites en dur. */}
          <div className="mt-5 card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Conditionnement</h2>
            <dl className="grid grid-cols-2 gap-y-1 text-ink-soft">
              {p.unitsPerCase ? (<><dt>Unités par colis</dt><dd className="text-right text-ink">{p.unitsPerCase}</dd></>) : null}
              {p.casesPerPallet ? (<><dt>Colis par palette</dt><dd className="text-right text-ink">{p.casesPerPallet}</dd></>) : null}
              {unitsPerPallet ? (<><dt>Unités par palette</dt><dd className="text-right text-ink">{unitsPerPallet}</dd></>) : null}
              {p.storageType ? (<><dt>Conservation</dt><dd className="text-right text-ink">{STORAGE_LABEL[p.storageType] ?? p.storageType}</dd></>) : null}
              {p.countryOrigin ? (<><dt>Origine</dt><dd className="text-right text-ink">{p.countryOrigin}</dd></>) : null}
              {p.availableCases != null ? (<><dt>Disponibilité</dt><dd className="text-right text-ink">{p.availableCases} colis</dd></>) : null}
            </dl>
          </div>

          <div className="mt-5">
            {p.unitsPerCase ? (
              <CaseSelector product={{
                productId: p.id, unitsPerCase: p.unitsPerCase, casesPerPallet: p.casesPerPallet,
                caseOrderStep: p.caseOrderStep, minimumCases: p.minimumCases, availableCases: p.availableCases,
                canSeePrice: p.canSeePrice, unitPriceHtCents: p.unitPriceHtCents, orderable: p.orderable,
              }} />
            ) : <p className="text-sm text-ink-faint">Conditionnement à confirmer — produit non commandable.</p>}
          </div>
        </div>
      </div>

      {p.description ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-2 text-lg font-semibold">Description</h2>
          <div className="prose-sm text-sm leading-relaxed text-ink-soft" dangerouslySetInnerHTML={{ __html: p.description }} />
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">Autres produits {p.brand.name}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
