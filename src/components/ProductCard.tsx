import Image from 'next/image';
import Link from 'next/link';
import type { PublicProduct } from '@/lib/product-dto';
import { CaseSelector } from './CaseSelector';

const STORAGE_LABEL: Record<string, string> = { frozen: 'Surgelé', chilled: 'Frais', ambient: 'Ambiant' };

export function ProductCard({ p }: { p: PublicProduct }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/produit/${p.handle}`} className="relative block aspect-square bg-white">
        {p.imageUrl ? (
          <Image src={p.imageUrl} alt={p.title} fill sizes="(max-width:768px) 50vw, 25vw"
            className="object-contain p-3" />
        ) : (
          <div className="grid h-full place-items-center text-ink-faint">Sans image</div>
        )}
        {p.storageType ? <span className="badge absolute left-2 top-2">{STORAGE_LABEL[p.storageType] ?? p.storageType}</span> : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <Link href={`/marques/${p.brand.slug}`} className="font-medium text-brand hover:underline">{p.brand.name}</Link>
          {p.category ? <span>{p.category}</span> : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/produit/${p.handle}`}>{p.title}</Link>
        </h3>
        <div className="mt-auto flex items-baseline justify-between">
          <span className={p.canSeePrice ? 'text-sm font-semibold text-ink' : 'text-sm text-ink-faint'}>
            {p.displayCasePrice}
            {p.canSeePrice ? <span className="ml-1 text-xs font-normal text-ink-faint">/ colis</span> : null}
          </span>
          {p.sku ? <span className="text-[11px] text-ink-faint">{p.sku}</span> : null}
        </div>

        {p.unitsPerCase ? (
          <CaseSelector
            compact
            product={{
              productId: p.id,
              unitsPerCase: p.unitsPerCase,
              casesPerPallet: p.casesPerPallet,
              caseOrderStep: p.caseOrderStep,
              minimumCases: p.minimumCases,
              availableCases: p.availableCases,
              canSeePrice: p.canSeePrice,
              unitPriceHtCents: p.unitPriceHtCents,
              orderable: p.orderable,
            }}
          />
        ) : (
          <p className="text-xs text-ink-faint">Conditionnement à confirmer</p>
        )}
      </div>
    </article>
  );
}
