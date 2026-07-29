'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { useCart } from './CartProvider';
import type { SessionUser } from '@/lib/auth';

export function Header({ user }: { user: SessionUser | null }) {
  const { cart, setOpen } = useCart();
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-dark bg-brand text-white">
      <div className="container-gs flex h-16 items-center gap-4">
        <Link href="/" aria-label="Accueil Green Square"><Logo /></Link>

        <nav className="ml-4 hidden items-center gap-5 text-sm md:flex" aria-label="Navigation principale">
          <Link href="/catalogue" className="text-white/85 hover:text-white">Catalogue</Link>
          <Link href="/marchands" className="text-white/85 hover:text-white">Marchands</Link>
          <Link href="/marques" className="text-white/85 hover:text-white">Marques</Link>
          <Link href="/compte/demande-pro" className="text-white/85 hover:text-white">Compte pro</Link>
        </nav>

        <form action="/catalogue" className="ml-auto hidden max-w-xs flex-1 md:block">
          <input name="q" type="search" placeholder="Rechercher un produit, une réf…" className="field" aria-label="Recherche" />
        </form>

        <div className="ml-auto flex items-center gap-3 md:ml-2">
          {user ? (
            <div className="hidden items-center gap-2 text-sm sm:flex">
              {user.role === 'ADMIN' ? (
                <Link href="/admin" className="rounded-control bg-white/15 px-2 py-1 font-medium text-white hover:bg-white/25">Admin</Link>
              ) : null}
              <span className="text-white/80">{user.role === 'PRO_VALIDE' ? 'Pro validé' : user.role === 'ADMIN' ? 'Admin' : 'Compte'}</span>
              <button onClick={logout} className="text-white/80 hover:text-white">Déconnexion</button>
            </div>
          ) : (
            <Link href="/connexion" className="text-sm text-white/85 hover:text-white">Connexion</Link>
          )}
          <button onClick={() => setOpen(true)} className="btn relative border-white/70 bg-white text-brand-dark hover:bg-white/90" aria-label="Ouvrir le panier">
            Panier
            {cart && cart.totalCases > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">
                {cart.totalCases}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
