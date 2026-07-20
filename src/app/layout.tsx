import type { Metadata } from 'next';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'Green Square — Approvisionnement agroalimentaire B2B', template: '%s — Green Square' },
  description:
    "Plateforme B2B d'intermédiation agroalimentaire. Marques référencées, commande par colis et palette, tarifs professionnels HT.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <Header user={user} />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
