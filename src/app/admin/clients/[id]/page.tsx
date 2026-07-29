import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatEurFromCents } from '@/lib/b2b';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';
import { setClientMerchantVisibility } from '../../actions';

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, merchants, access, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { proRequest: true } }),
    prisma.merchant.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.clientMerchantAccess.findMany({ where: { userId: id } }),
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { items: true } } } }),
  ]);
  if (!user) notFound();

  const visibleByMerchant = new Map(access.map((a) => [a.merchantId, a.visible]));

  return (
    <>
      <AdminPageHeader
        title={user.companyName ?? user.email}
        subtitle={user.email}
        actions={<Link href="/admin/clients" className="btn-outline text-sm">← Clients</Link>}
      />

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Coordonnées</h2>
        <div className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
          <div><span className="text-ink-faint">Contact : </span>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</div>
          <div><span className="text-ink-faint">Téléphone : </span>{user.phone ?? user.proRequest?.phone ?? '—'}</div>
          <div><span className="text-ink-faint">Rôle : </span><StatusPill label={user.role === 'PRO_VALIDE' ? 'Client validé' : user.role === 'ADMIN' ? 'Admin' : 'Visiteur'} tone={user.role === 'PRO_VALIDE' ? 'green' : 'neutral'} /></div>
          {user.proRequest ? <div><span className="text-ink-faint">SIRET : </span>{user.proRequest.siret}</div> : null}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Mandants visibles</h2>
        <p className="mb-3 text-sm text-ink-soft">Par défaut, un client ne voit aucun mandant. Activez ceux qu'il peut consulter et commander.</p>
        <Table>
          <THead>
            <TR>
              <TH>Mandant</TH>
              <TH>Visible pour ce client</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <tbody>
            {merchants.length === 0 ? (
              <EmptyRow colSpan={3}>Aucun mandant.</EmptyRow>
            ) : (
              merchants.map((m) => {
                const visible = visibleByMerchant.get(m.id) === true;
                return (
                  <TR key={m.id}>
                    <TD className="font-medium text-ink">{m.name}</TD>
                    <TD>{visible ? <StatusPill label="Visible" tone="green" /> : <StatusPill label="Masqué" tone="neutral" />}</TD>
                    <TD className="text-right">
                      <form action={setClientMerchantVisibility}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="merchantId" value={m.id} />
                        <input type="hidden" name="visible" value={visible ? '0' : '1'} />
                        <button className={visible ? 'btn-outline px-3 py-1 text-xs' : 'btn-primary px-3 py-1 text-xs'}>
                          {visible ? 'Masquer' : 'Rendre visible'}
                        </button>
                      </form>
                    </TD>
                  </TR>
                );
              })
            )}
          </tbody>
        </Table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Historique des commandes ({orders.length})</h2>
        <Table>
          <THead>
            <TR>
              <TH>Référence</TH>
              <TH>Date</TH>
              <TH className="text-right">Lignes</TH>
              <TH className="text-right">Total HT</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {orders.length === 0 ? (
              <EmptyRow colSpan={5}>Aucune commande.</EmptyRow>
            ) : (
              orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium text-ink">{o.reference}</TD>
                  <TD className="whitespace-nowrap text-ink-soft">{o.createdAt.toLocaleDateString('fr-FR')}</TD>
                  <TD className="text-right">{o._count.items}</TD>
                  <TD className="text-right">{formatEurFromCents(o.subtotalHtCents)}</TD>
                  <TD className="text-right"><Link href={`/admin/commandes/${o.id}`} className="text-sm text-brand hover:underline">Voir</Link></TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </section>
    </>
  );
}
