'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/demandes', label: 'Demandes pro' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/commandes', label: 'Commandes' },
  { href: '/admin/mandants', label: 'Mandants' },
  { href: '/admin/produits', label: 'Produits' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {NAV.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-muted hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
