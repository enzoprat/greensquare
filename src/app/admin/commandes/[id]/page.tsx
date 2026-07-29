import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminOrder } from '@/lib/orders-admin';
import { formatEurFromCents } from '@/lib/b2b';
import { AdminPageHeader, Table, THead, TH, TD, TR } from '@/components/admin/ui';
import { setOrderStatus } from '../../actions';

const STATUSES: { value: string; label: string }[] = [
  { value: 'RECEIVED', label: 'Reçue' },
  { value: 'PROCESSED', label: 'En préparation' },
  { value: 'SENT_TO_EBP', label: 'Envoyée EBP' },
  { value: 'REJECTED', label: 'Rejetée' },
];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  const { order, lines } = data;

  return (
    <>
      <AdminPageHeader
        title={`Commande ${order.reference}`}
        subtitle={`${order.user.companyName ?? order.user.email} · ${order.createdAt.toLocaleDateString('fr-FR')}`}
        actions={
          <>
            <Link href="/admin/commandes" className="btn-outline text-sm">← Commandes</Link>
            <a href={`/admin/commandes/${order.id}/export`} className="btn-outline text-sm">Export CSV</a>
            <Link href={`/admin/commandes/${order.id}/imprimer`} className="btn-primary text-sm" target="_blank">Imprimer / PDF</Link>
          </>
        }
      />

      <form action={setOrderStatus} className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <input type="hidden" name="orderId" value={order.id} />
        <label className="label mb-0">Statut</label>
        <select name="status" defaultValue={order.status} className="field w-auto">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="btn-primary text-sm">Mettre à jour</button>
      </form>

      <Table>
        <THead>
          <TR>
            <TH>Photo</TH>
            <TH>Article</TH>
            <TH>Réf. (SKU)</TH>
            <TH className="text-right">Colis</TH>
            <TH className="text-right">Unités</TH>
            <TH className="text-right">PU HT</TH>
            <TH className="text-right">Total HT</TH>
          </TR>
        </THead>
        <tbody>
          {lines.map((l) => (
            <TR key={l.id}>
              <TD>
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt={l.title} className="h-12 w-12 rounded border border-line object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded border border-line bg-surface-muted" />
                )}
              </TD>
              <TD>
                <div className="font-medium text-ink">{l.title}</div>
                <div className="text-xs text-ink-faint">{l.brandName}</div>
              </TD>
              <TD className="whitespace-nowrap">{l.sku || '—'}</TD>
              <TD className="text-right">{l.caseQuantity}</TD>
              <TD className="text-right">{l.units}</TD>
              <TD className="text-right">{formatEurFromCents(l.unitPriceHtCents)}</TD>
              <TD className="text-right font-medium">{formatEurFromCents(l.lineTotalHtCents)}</TD>
            </TR>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <td colSpan={6} className="px-3 py-3 text-right font-medium">Sous-total HT</td>
            <td className="px-3 py-3 text-right text-lg font-semibold">{formatEurFromCents(order.subtotalHtCents)}</td>
          </tr>
        </tfoot>
      </Table>
    </>
  );
}
