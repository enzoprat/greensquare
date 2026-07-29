import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';

export default async function AdminMerchantsPage() {
  const merchants = await prisma.merchant.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { brands: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="Mandants"
        subtitle="Marchands de la plateforme. Éditez nom, logo, marques et produits."
        actions={<Link href="/admin/mandants/nouveau" className="btn-primary text-sm">+ Nouveau mandant</Link>}
      />
      <Table>
        <THead>
          <TR>
            <TH>Logo</TH>
            <TH>Nom</TH>
            <TH className="text-right">Marques</TH>
            <TH>Statut</TH>
            <TH></TH>
          </TR>
        </THead>
        <tbody>
          {merchants.length === 0 ? (
            <EmptyRow colSpan={5}>Aucun mandant.</EmptyRow>
          ) : (
            merchants.map((m) => (
              <TR key={m.id}>
                <TD>
                  {m.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logoUrl} alt={m.name} className="h-8 max-w-[80px] object-contain" />
                  ) : <span className="text-ink-faint">—</span>}
                </TD>
                <TD className="font-medium text-ink">{m.name}</TD>
                <TD className="text-right">{m._count.brands}</TD>
                <TD>{m.active ? <StatusPill label="Actif" tone="green" /> : <StatusPill label="Inactif" tone="neutral" />}</TD>
                <TD className="text-right"><Link href={`/admin/mandants/${m.id}`} className="text-sm text-brand hover:underline">Éditer</Link></TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
