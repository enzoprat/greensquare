import Link from 'next/link';
import type { Metadata } from 'next';
import { getMerchants } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Marchands',
  description: 'Les marchands référencés sur Green Square. Chaque marchand regroupe ses marques.',
};

export default async function MerchantsPage() {
  const merchants = await getMerchants();
  return (
    <div className="container-gs py-8">
      <h1 className="text-2xl font-semibold">Marchands référencés</h1>
      <p className="mt-1 text-sm text-ink-soft">Sélectionnez un marchand pour accéder à ses marques et filtrer par type de produit.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {merchants.map((m) => (
          <Link key={m.slug} href={`/marchands/${m.slug}`} className="card flex flex-col items-center justify-center gap-3 p-6 text-center hover:border-brand">
            {m.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.logoUrl} alt={m.name} className="max-h-14 object-contain" />
            ) : (
              <span className="text-lg font-semibold text-brand">{m.name}</span>
            )}
            <span className="text-xs text-ink-faint">{m.brandCount} marques · {m.productCount} produits</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
