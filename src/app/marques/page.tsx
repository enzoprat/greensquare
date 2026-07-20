import Link from 'next/link';
import type { Metadata } from 'next';
import { getBrands } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Marques',
  description: 'Toutes les marques agroalimentaires référencées sur Green Square.',
};

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="container-gs py-8">
      <h1 className="text-2xl font-semibold">Marques référencées</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <Link key={b.slug} href={`/marques/${b.slug}`} className="card flex flex-col items-center justify-center gap-2 p-6 hover:border-brand">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt={b.name} className="max-h-12 object-contain" />
            ) : (
              <span className="text-lg font-semibold text-brand">{b.name}</span>
            )}
            <span className="text-xs text-ink-faint">{(b as { _count?: { products: number } })._count?.products ?? 0} produits</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
