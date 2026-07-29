import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAdminOrder } from '@/lib/orders-admin';
import { toCsv } from '@/lib/csv';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) return new NextResponse('Not found', { status: 404 });
  const { order, lines } = data;

  const rows = lines.map((l) => ({
    reference: order.reference,
    sku: l.sku,
    ean: l.ean,
    article: l.title,
    marque: l.brandName,
    colis: l.caseQuantity,
    unites_par_colis: l.unitsPerCase,
    unites: l.units,
    pu_ht_eur: (l.unitPriceHtCents / 100).toFixed(2),
    total_ht_eur: (l.lineTotalHtCents / 100).toFixed(2),
  }));

  const csv = toCsv(rows, ['reference', 'sku', 'ean', 'article', 'marque', 'colis', 'unites_par_colis', 'unites', 'pu_ht_eur', 'total_ht_eur']);
  // BOM so Excel opens UTF-8 correctly.
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commande-${order.reference}.csv"`,
    },
  });
}
