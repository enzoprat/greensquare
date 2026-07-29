import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatEurFromCents } from '@/lib/b2b';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';

const STATUS = {
  RECEIVED: { label: 'Reçue', tone: 'amber' },
  PROCESSED: { label: 'En préparation', tone: 'green' },
  SENT_TO_EBP: { label: 'Envoyée EBP', tone: 'green' },
  REJECTED: { label: 'Rejetée', tone: 'red' },
} as const;

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { companyName: true, email: true } }, _count: { select: { items: true } } },
  });

  return (
    <>
      <AdminPageHeader title="Commandes" subtitle="Toutes les commandes reçues." />
      <Table>
        <THead>
          <TR>
            <TH>Référence</TH>
            <TH>Client</TH>
            <TH>Date</TH>
            <TH className="text-right">Lignes</TH>
            <TH className="text-right">Total HT</TH>
            <TH>Statut</TH>
            <TH></TH>
          </TR>
        </THead>
        <tbody>
          {orders.length === 0 ? (
            <EmptyRow colSpan={7}>Aucune commande.</EmptyRow>
          ) : (
            orders.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium text-ink">{o.reference}</TD>
                <TD>
                  <div>{o.user.companyName ?? '—'}</div>
                  <div className="text-xs text-ink-faint">{o.user.email}</div>
                </TD>
                <TD className="whitespace-nowrap text-ink-soft">{o.createdAt.toLocaleDateString('fr-FR')}</TD>
                <TD className="text-right">{o._count.items}</TD>
                <TD className="text-right">{formatEurFromCents(o.subtotalHtCents)}</TD>
                <TD><StatusPill label={STATUS[o.status].label} tone={STATUS[o.status].tone} /></TD>
                <TD className="text-right"><Link href={`/admin/commandes/${o.id}`} className="text-sm text-brand hover:underline">Voir</Link></TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
