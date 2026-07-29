import { prisma } from './prisma';
import { lineTotalHtCents } from './b2b';

/** Full order for admin views (detail, print, CSV). Items joined to product for image/title/ref. */
export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { product: { select: { title: true, handle: true, imageUrl: true, ean: true } } } },
    },
  });
  if (!order) return null;

  const lines = order.items.map((it) => ({
    id: it.id,
    imageUrl: it.product?.imageUrl ?? null,
    title: it.product?.title ?? '—',
    sku: it.sku ?? '',
    ean: it.product?.ean ?? '',
    brandName: it.brandName,
    caseQuantity: it.caseQuantity,
    unitsPerCase: it.unitsPerCase,
    units: it.caseQuantity * it.unitsPerCase,
    unitPriceHtCents: it.unitPriceHtCents,
    lineTotalHtCents: lineTotalHtCents(it.unitPriceHtCents, it.unitsPerCase, it.caseQuantity),
  }));

  return { order, lines };
}
