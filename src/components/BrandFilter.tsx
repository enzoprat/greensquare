import Link from 'next/link';

interface BrandItem { slug: string; name: string; logoUrl: string | null }

/**
 * Visual brand navigation by logo (section 20). Horizontal scroll on mobile
 * with snapping; grid feel on desktop. Active state via aria-current.
 * Links preserve the current query string except the brand param.
 */
export function BrandFilter({ brands, active, baseQuery, basePath = '/catalogue' }: { brands: BrandItem[]; active?: string; baseQuery: URLSearchParams; basePath?: string }) {
  const hrefFor = (slug?: string) => {
    const p = new URLSearchParams(baseQuery);
    if (slug) p.set('brand', slug); else p.delete('brand');
    p.delete('page');
    const s = p.toString();
    return `${basePath}${s ? `?${s}` : ''}`;
  };

  return (
    <nav aria-label="Filtrer par marque" className="-mx-4 px-4">
      <ul className="flex snap-x gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
        <li className="snap-start">
          <Link href={hrefFor()} aria-current={!active ? 'true' : undefined}
            className={`flex h-14 min-w-24 items-center justify-center rounded-card border px-3 text-sm font-medium ${!active ? 'border-brand bg-brand-light text-brand-dark' : 'border-line bg-white text-ink-soft hover:border-brand'}`}>
            Toutes
          </Link>
        </li>
        {brands.map((b) => (
          <li key={b.slug} className="snap-start">
            <Link href={hrefFor(b.slug)} aria-current={active === b.slug ? 'true' : undefined}
              title={b.name}
              className={`flex h-14 min-w-24 items-center justify-center rounded-card border px-3 ${active === b.slug ? 'border-brand bg-brand-light' : 'border-line bg-white hover:border-brand'}`}>
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl} alt={b.name} className="max-h-9 max-w-[80px] object-contain" />
              ) : (
                <span className={`text-sm font-semibold ${active === b.slug ? 'text-brand-dark' : 'text-ink'}`}>{b.name}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
