'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';

export default function CartPage() {
  const { cart, mutate, refresh, loading } = useCart();
  const [msg, setMsg] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

  const checkout = async () => {
    setMsg(null);
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.ok) { setRef(data.reference); await refresh(); }
    else setMsg(data.message ?? 'Commande impossible.');
  };

  if (ref) {
    return (
      <div className="container-gs py-16 text-center">
        <h1 className="text-2xl font-semibold">Demande de commande enregistrée</h1>
        <p className="mt-2 text-ink-soft">Référence <strong>{ref}</strong>. Paiement à la livraison / hors ligne. Notre équipe revient vers vous.</p>
        <Link href="/catalogue" className="btn-primary mt-6">Retour au catalogue</Link>
      </div>
    );
  }

  if (!cart || cart.lineCount === 0) {
    return (
      <div className="container-gs py-16 text-center">
        <h1 className="text-2xl font-semibold">Votre panier est vide</h1>
        <Link href="/catalogue" className="btn-primary mt-6">Parcourir le catalogue</Link>
      </div>
    );
  }

  const min = cart.minimum;

  return (
    <div className="container-gs grid gap-8 py-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-2xl font-semibold">Panier</h1>
        {cart.byBrand.map((g) => (
          <section key={g.brandSlug} className="mt-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">{g.brandName}</h2>
            <ul className="divide-y divide-line rounded-card border border-line bg-white">
              {g.lines.map((l) => (
                <li key={l.productId} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-ink-faint">
                      {l.sku ? `${l.sku} · ` : ''}{l.unitsPerCase} u/colis · {l.totalUnits} unités
                      {l.casesPerPallet ? ` · ${l.fullPallets} palette(s) + ${l.remainingCases} colis` : ''}
                    </p>
                    <p className="text-xs text-ink-soft">{l.displayCasePrice} / colis</p>
                  </div>
                  <div className="inline-flex items-stretch rounded-control border border-line text-sm">
                    <button className="px-3" aria-label="Retirer un colis" disabled={loading} onClick={() => mutate('set', l.productId, l.caseQuantity - 1)}>−</button>
                    <span className="min-w-10 border-x border-line px-2 text-center leading-8">{l.caseQuantity}</span>
                    <button className="px-3" aria-label="Ajouter un colis" disabled={loading} onClick={() => mutate('set', l.productId, l.caseQuantity + 1)}>+</button>
                  </div>
                  <div className="w-24 text-right font-medium">{l.displayLineTotal}</div>
                  <button className="text-xs text-danger hover:underline" disabled={loading} onClick={() => mutate('remove', l.productId)}>Retirer</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="h-fit card p-5 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Récapitulatif</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Sous-total marchandises HT</dt><dd>{cart.displaySubtotal}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Sous-total net HT</dt><dd>{cart.displaySubtotal}</dd></div>
        </dl>

        {cart.canSeePrice ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded bg-surface-muted">
              <div className={`h-full transition-all ${min.reached ? 'bg-brand' : 'bg-accent'}`} style={{ width: `${Math.round(min.progressRatio * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {min.reached
                ? 'Minimum de commande atteint.'
                : `Minimum 1 500 € HT — il reste ${min.displayRemaining}.`}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">Connectez-vous avec un compte pro validé pour voir les prix et commander.</p>
        )}

        {msg ? <p className="mt-3 rounded-control bg-red-50 px-3 py-2 text-xs text-danger">{msg}</p> : null}

        <button className="btn-primary mt-4 w-full" disabled={!cart.checkoutAllowed || loading} onClick={checkout}>
          Valider la demande de commande
        </button>
        {cart.blockReason && !cart.checkoutAllowed ? <p className="mt-2 text-xs text-ink-faint">{cart.blockReason}</p> : null}
      </aside>
    </div>
  );
}
