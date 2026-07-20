import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="container-gs grid gap-8 py-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            Plateforme B2B d&apos;intermédiation agroalimentaire. Commande par colis et palette,
            marques référencées, minimum de commande 1 500 € HT.
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Catalogue</h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            <li><Link href="/catalogue" className="hover:text-brand">Tous les produits</Link></li>
            <li><Link href="/marques" className="hover:text-brand">Marques</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Compte</h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            <li><Link href="/connexion" className="hover:text-brand">Connexion</Link></li>
            <li><Link href="/compte/demande-pro" className="hover:text-brand">Devenir client pro</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Green Square — Prix HT réservés aux professionnels validés.
      </div>
    </footer>
  );
}
