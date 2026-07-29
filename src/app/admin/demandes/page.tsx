import { prisma } from '@/lib/prisma';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';
import { approveProRequest, rejectProRequest } from '../actions';

const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' } as const;
const STATUS_LABEL = { PENDING: 'En attente', APPROVED: 'Validée', REJECTED: 'Refusée' } as const;

export default async function AdminDemandesPage() {
  const requests = await prisma.proAccountRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <>
      <AdminPageHeader title="Demandes pro" subtitle="Demandes « devenir client ». Validez pour ouvrir les tarifs et la commande." />
      <Table>
        <THead>
          <TR>
            <TH>Entreprise</TH>
            <TH>Contact</TH>
            <TH>SIRET</TH>
            <TH>Reçue le</TH>
            <TH>Statut</TH>
            <TH className="text-right">Action</TH>
          </TR>
        </THead>
        <tbody>
          {requests.length === 0 ? (
            <EmptyRow colSpan={6}>Aucune demande pour le moment.</EmptyRow>
          ) : (
            requests.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="font-medium text-ink">{r.companyName}</div>
                  {r.tradeName ? <div className="text-xs text-ink-faint">{r.tradeName}</div> : null}
                </TD>
                <TD>
                  <div>{r.firstName} {r.lastName}</div>
                  <div className="text-xs text-ink-faint">{r.email} · {r.phone}</div>
                </TD>
                <TD className="whitespace-nowrap">{r.siret}</TD>
                <TD className="whitespace-nowrap text-ink-soft">{r.createdAt.toLocaleDateString('fr-FR')}</TD>
                <TD><StatusPill label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /></TD>
                <TD className="text-right">
                  {r.status === 'PENDING' ? (
                    <div className="flex justify-end gap-2">
                      <form action={approveProRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button className="btn-primary px-3 py-1 text-xs">Valider</button>
                      </form>
                      <form action={rejectProRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button className="btn-outline px-3 py-1 text-xs">Refuser</button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-faint">
                      {r.reviewedAt ? `Traitée le ${r.reviewedAt.toLocaleDateString('fr-FR')}` : '—'}
                    </span>
                  )}
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
