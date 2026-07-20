'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';

export function CartDrawer() {
  const { cart, open, setOpen, mutate, loading } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape (accessibility, section 30).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  const min = cart?.minimum;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panier">
      <button aria-label="Fermer" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div ref={panelRef} tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl outline-none">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">Panier{cart ? ` (${cart.totalCases} colis)` : ''}</h2>
          <button className="text-ink-faint hover:text-ink" aria-label="Fermer le panier" onClick={() => setOpen(false)}>✕</button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!cart || cart.lineCount === 0 ? (
            <p className="py-10 text-center text-sm text-ink-faint">Votre panier est vide.</p>
          ) : (
            cart.byBrand.map((g) => (
              <section key={g.brandSlug} className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{g.brandName}</h3>
                <ul className="space-y-3">
                  {g.lines.map((l) => (
                    <li key={l.productId} className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-snug">{l.title}</p>
                        <p className="text-xs text-ink-faint">{l.totalUnits} unités · {l.displayCasePrice} / colis</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="inline-flex items-stretch rounded-control border border-line text-sm">
                            <button className="px-2" aria-label="Retirer un colis" disabled={loading}
                              onClick={() => mutate('set', l.productId, l.caseQuantity - 1)}>−</button>
                            <span className="min-w-8 border-x border-line px-2 text-center">{l.caseQuantity}</span>
                            <button className="px-2" aria-label="Ajouter un colis" disabled={loading}
                              onClick={() => mutate('set', l.productId, l.caseQuantity + 1)}>+</button>
                          </div>
                          <span className="text-xs text-ink-faint">colis</span>
                          <button className="ml-auto text-xs text-danger hover:underline" disabled={loading}
                            onClick={() => mutate('remove', l.productId)}>Retirer</button>
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">{l.displayLineTotal}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="border-t border-line px-4 py-3">
          {cart && min ? (
            <>
              <div className="mb-2 flex justify-between text-sm">
                <span>Sous-total HT</span>
                <span className="font-semibold">{cart.displaySubtotal}</span>
              </div>
              {cart.canSeePrice && !min.reached ? (
                <div className="mb-2">
                  <div className="h-1.5 w-full overflow-hidden rounded bg-surface-muted">
                    <div className="h-full bg-brand transition-all" style={{ width: `${Math.round(min.progressRatio * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Minimum {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(min.minimumHtCents / 100)} HT — il reste {min.displayRemaining}.
                  </p>
                </div>
              ) : null}
              {cart.blockReason ? <p className="mb-2 text-xs text-danger">{cart.blockReason}</p> : null}
              <Link href="/panier" className="btn-outline w-full">Voir le panier</Link>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
