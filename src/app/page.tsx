import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getMerchants, getCatalog, getCategories } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export default async function HomePage() {
  const user = await getCurrentUser();
  const [merchants, featured, categories] = await Promise.all([
    getMerchants(),
    getCatalog({ sort: 'new' }, user?.role),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero — entrée rapide dans le catalogue, pas de landing marketing vide. */}
      <section className="border-b border-line bg-white">
        <div className="container-gs grid gap-8 py-12 md:grid-cols-2 md:py-16">
          <div className="flex flex-col justify-center">
            <p className="badge w-fit">Plateforme B2B agroalimentaire</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
              Approvisionnez votre établissement, par colis et par palette.
            </h1>
            <p className="mt-3 max-w-md text-ink-soft">
              Marques référencées, tarifs professionnels HT, logistique maîtrisée.
              Minimum de commande 1 500 € HT. Tarifs réservés aux comptes professionnels validés.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/catalogue" className="btn-primary">Accéder au catalogue</Link>
              <Link href="/compte/demande-pro" className="btn-outline">Devenir client</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map((p) => (
              <div key={p.id} className="card flex items-center justify-center bg-white p-4">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.title} className="max-h-32 object-contain" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marchands — point d'entrée du catalogue. Chaque marchand regroupe ses marques. */}
      <section className="container-gs py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Nos marchands</h2>
          <Link href="/catalogue" className="text-sm text-brand hover:underline">Voir tout le catalogue</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {merchants.map((m) => (
            <Link key={m.slug} href={`/marchands/${m.slug}`}
              className="card flex flex-col items-center justify-center gap-3 p-6 text-center hover:border-brand">
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
      </section>

      {/* Catégories */}
      {categories.length ? (
        <section className="container-gs pb-4">
          <h2 className="mb-3 text-xl font-semibold">Catégories</h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c}>
                <Link href={`/catalogue?category=${encodeURIComponent(c)}`} className="btn-outline">{c}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Produits mis en avant */}
      <section className="container-gs py-8">
        <h2 className="mb-4 text-xl font-semibold">Nouveautés du catalogue</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="border-t border-line bg-white">
        <div className="container-gs grid gap-6 py-10 md:grid-cols-3">
          {[
            { t: 'Commande par colis', d: "Sélectionnez le nombre de colis. Les unités et le total HT se calculent automatiquement." },
            { t: 'Palette rapide', d: "Ajoutez une palette complète en un clic lorsque le colisage le permet." },
            { t: 'Minimum 1 500 € HT', d: "Le minimum de commande s'applique au sous-total net HT, hors TVA et livraison." },
          ].map((x) => (
            <div key={x.t}>
              <h3 className="font-semibold">{x.t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
