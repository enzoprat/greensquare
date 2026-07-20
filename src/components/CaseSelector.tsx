'use client';

import { useState } from 'react';
import {
  clampCaseQuantity,
  unitsFromCases,
  paletteBreakdown,
  casePriceHtCents,
  formatEurFromCents,
  casesForOnePallet,
} from '@/lib/b2b';
import { useCart } from './CartProvider';

export interface CaseSelectorProduct {
  productId: string;
  unitsPerCase: number;
  casesPerPallet: number | null;
  caseOrderStep: number;
  minimumCases: number;
  availableCases: number | null; // null = unlimited
  canSeePrice: boolean;
  unitPriceHtCents: number | null;
  orderable: boolean;
}

export function CaseSelector({ product, compact = false }: { product: CaseSelectorProduct; compact?: boolean }) {
  const { mutate, setOpen, loading } = useCart();
  const packaging = {
    unitsPerCase: product.unitsPerCase,
    casesPerPallet: product.casesPerPallet,
    caseOrderStep: product.caseOrderStep,
    minimumCases: product.minimumCases,
  };
  const stockUnits = product.availableCases == null ? null : product.availableCases * product.unitsPerCase;
  const start = clampCaseQuantity(product.minimumCases, packaging, stockUnits);
  const [cases, setCases] = useState<number>(start > 0 ? start : product.minimumCases);
  const [added, setAdded] = useState(false);

  const setQ = (n: number) => setCases(Math.max(0, Math.floor(n || 0)));
  const step = Math.max(1, product.caseOrderStep);
  const pallet = paletteBreakdown(cases, product.unitsPerCase, product.casesPerPallet);
  const onePallet = casesForOnePallet(product.casesPerPallet);
  const lineTotal = product.canSeePrice && product.unitPriceHtCents != null
    ? casePriceHtCents(product.unitPriceHtCents, product.unitsPerCase) * cases
    : null;

  const commit = async (op: 'add') => {
    const finalCases = clampCaseQuantity(cases, packaging, stockUnits);
    if (finalCases <= 0) return;
    await mutate(op, product.productId, finalCases);
    setAdded(true);
    setOpen(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (!product.orderable) {
    return <p className="text-sm text-ink-faint">Indisponible</p>;
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-stretch rounded-control border border-line" role="group" aria-label="Quantité en colis">
          <button type="button" className="px-3 text-lg leading-none hover:bg-surface-muted" aria-label="Retirer un colis"
            onClick={() => setQ(cases - step)}>−</button>
          <input
            type="number" inputMode="numeric" min={0} step={step} value={cases}
            aria-label="Nombre de colis"
            onChange={(e) => setQ(Number(e.target.value))}
            className="w-14 border-x border-line text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button type="button" className="px-3 text-lg leading-none hover:bg-surface-muted" aria-label="Ajouter un colis"
            onClick={() => setQ(cases + step)}>+</button>
        </div>
        <span className="text-sm text-ink-soft">colis</span>
      </div>

      <ul className="text-xs text-ink-soft">
        <li>{product.unitsPerCase} unités par colis</li>
        <li>{unitsFromCases(cases, product.unitsPerCase)} unités au total</li>
        {product.casesPerPallet ? (
          <li>{pallet.fullPallets} palette{pallet.fullPallets > 1 ? 's' : ''} complète{pallet.fullPallets > 1 ? 's' : ''} + {pallet.remainingCases} colis</li>
        ) : null}
        {lineTotal != null ? <li className="font-medium text-ink">{formatEurFromCents(lineTotal)}</li> : <li className="text-ink-faint">N/D</li>}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex-1" disabled={loading} onClick={() => commit('add')}>
          {added ? 'Ajouté ✓' : 'Ajouter au panier'}
        </button>
        {onePallet ? (
          <button type="button" className="btn-outline" disabled={loading}
            aria-label="Ajouter une palette"
            onClick={() => mutate('add', product.productId, onePallet).then(() => setOpen(true))}>
            + 1 palette ({onePallet} colis)
          </button>
        ) : null}
      </div>
    </div>
  );
}
