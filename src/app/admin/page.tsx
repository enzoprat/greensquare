import { prisma } from '@/lib/prisma';
import { AdminPageHeader, StatCard } from '@/components/admin/ui';

export default async function AdminDashboardPage() {
  const [pendingRequests, clients, orders, merchants, activeProducts, dormantProducts] = await Promise.all([
    prisma.proAccountRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'PRO_VALIDE' } }),
    prisma.order.count(),
    prisma.merchant.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'DORMANT' } }),
  ]);

  return (
    <>
      <AdminPageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme Green Square." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Demandes en attente" value={pendingRequests} href="/admin/demandes" />
        <StatCard label="Clients validés" value={clients} href="/admin/clients" />
        <StatCard label="Commandes" value={orders} href="/admin/commandes" />
        <StatCard label="Mandants" value={merchants} href="/admin/mandants" />
        <StatCard label="Produits actifs" value={activeProducts} href="/admin/produits" />
        <StatCard label="Produits en sommeil" value={dormantProducts} href="/admin/produits?status=DORMANT" />
      </div>
    </>
  );
}
