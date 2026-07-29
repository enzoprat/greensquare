import { notFound } from 'next/navigation';
import { getAdminOrder } from '@/lib/orders-admin';
import { formatEurFromCents } from '@/lib/b2b';
import { PrintButton } from '@/components/admin/PrintButton';

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  const { order, lines } = data;

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-ink print:max-w-none print:p-0">
      {/* Print styles: hide storefront chrome + admin sidebar when printing. */}
      <style>{`@media print { header, footer, aside, .no-print { display: none !important; } body { background: #fff !important; } main { padding: 0 !important; } }`}</style>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xl font-semibold">Green Square</div>
          <div className="text-sm text-ink-soft">Bon de commande</div>
        </div>
        <PrintButton />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-ink-faint">Commande</div>
          <div className="font-medium">{order.reference}</div>
          <div>{order.createdAt.toLocaleDateString('fr-FR')}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-ink-faint">Client</div>
          <div className="font-medium">{order.user.companyName ?? '—'}</div>
          <div>{[order.user.firstName, order.user.lastName].filter(Boolean).join(' ')}</div>
          <div>{order.user.email}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-1 pr-2">Photo</th>
            <th className="py-1 pr-2">Article</th>
            <th className="py-1 pr-2">Réf.</th>
            <th className="py-1 pr-2 text-right">Colis</th>
            <th className="py-1 pr-2 text-right">Unités</th>
            <th className="py-1 pr-2 text-right">PU HT</th>
            <th className="py-1 text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-line">
              <td className="py-1 pr-2">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" className="h-10 w-10 object-contain" />
                ) : null}
              </td>
              <td className="py-1 pr-2">
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-ink-faint">{l.brandName}</div>
              </td>
              <td className="py-1 pr-2">{l.sku || '—'}</td>
              <td className="py-1 pr-2 text-right">{l.caseQuantity}</td>
              <td className="py-1 pr-2 text-right">{l.units}</td>
              <td className="py-1 pr-2 text-right">{formatEurFromCents(l.unitPriceHtCents)}</td>
              <td className="py-1 text-right">{formatEurFromCents(l.lineTotalHtCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="py-2 pr-2 text-right font-semibold">Sous-total HT</td>
            <td className="py-2 text-right text-lg font-bold">{formatEurFromCents(order.subtotalHtCents)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-6 text-xs text-ink-faint">Tarifs professionnels HT. Minimum de commande 1 500 € HT.</p>
    </div>
  );
}
