import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) return { title: 'Marque' };
  return {
    title: brand.name,
    description: brand.description ?? `Produits de la marque ${brand.name} disponibles sur Green Square, par colis et palette.`,
    alternates: { canonical: `/marques/${slug}` },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand || !brand.active) notFound();

  const products = await getCatalog({ brand: slug }, user?.role);

  return (
    <div className="container-gs py-8">
      <nav className="mb-4 text-sm text-ink-faint" aria-label="Fil d'Ariane">
        <a href="/" className="hover:text-brand">Accueil</a> / <a href="/marques" className="hover:text-brand">Marques</a> / <span className="text-ink">{brand.name}</span>
      </nav>

      <header className="card flex items-center gap-5 p-6">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={brand.name} className="max-h-16 object-contain" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-card bg-brand-light text-xl font-semibold text-brand">{brand.name.slice(0, 2)}</span>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{brand.name}</h1>
          {brand.description ? <p className="mt-1 max-w-2xl text-sm text-ink-soft">{brand.description}</p> : null}
          <p className="mt-1 text-sm text-ink-faint">{products.length} produits</p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
