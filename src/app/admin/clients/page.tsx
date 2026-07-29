import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';

const ROLE_TONE = { PRO_VALIDE: 'green', VISITOR: 'neutral', ADMIN: 'amber' } as const;
const ROLE_LABEL = { PRO_VALIDE: 'Client validé', VISITOR: 'Visiteur', ADMIN: 'Admin' } as const;

export default async function AdminClientsPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['PRO_VALIDE', 'VISITOR'] } },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { orders: true } } },
  });

  return (
    <>
      <AdminPageHeader title="Clients" subtitle="Comptes professionnels et visiteurs enregistrés." />
      <Table>
        <THead>
          <TR>
            <TH>Entreprise / Email</TH>
            <TH>Contact</TH>
            <TH>Statut</TH>
            <TH className="text-right">Commandes</TH>
            <TH>Inscrit le</TH>
            <TH></TH>
          </TR>
        </THead>
        <tbody>
          {users.length === 0 ? (
            <EmptyRow colSpan={6}>Aucun client.</EmptyRow>
          ) : (
            users.map((u) => (
              <TR key={u.id}>
                <TD>
                  <div className="font-medium text-ink">{u.companyName ?? '—'}</div>
                  <div className="text-xs text-ink-faint">{u.email}</div>
                </TD>
                <TD>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</TD>
                <TD><StatusPill label={ROLE_LABEL[u.role]} tone={ROLE_TONE[u.role]} /></TD>
                <TD className="text-right">{u._count.orders}</TD>
                <TD className="whitespace-nowrap text-ink-soft">{u.createdAt.toLocaleDateString('fr-FR')}</TD>
                <TD className="text-right">
                  <Link href={`/admin/clients/${u.id}`} className="text-sm text-brand hover:underline">Gérer</Link>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
