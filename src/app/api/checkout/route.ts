import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrCreateCart, validateCheckout } from '@/lib/cart';
import { lineTotalHtCents } from '@/lib/b2b';

/**
 * Authoritative order submission. Re-validates everything server-side (minimum,
 * pro status, packaging multiples, stock). This is the maison equivalent of a
 * Shopify Cart & Checkout Validation Function — the JS-disabled button is not
 * the security boundary; this is.
 */
export async function POST() {
  const user = await getCurrentUser();
  const check = await validateCheckout(user?.role, user?.id);
  if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: 422 });

  const cart = await getOrCreateCart(user!.id);
  const reference = `GS-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      reference,
      userId: user!.id,
      subtotalHtCents: check.subtotalHtCents,
      items: {
        create: cart.items.map((i) => ({
          productId: i.productId,
          sku: i.product.sku,
          brandName: i.product.brand.name,
          caseQuantity: i.caseQuantity,
          unitsPerCase: i.unitsPerCase,
          unitPriceHtCents: i.product.unitPriceHtCents!,
        })),
      },
    },
  });

  // Empty the cart after a successful order request (manual/offline payment).
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return NextResponse.json({ ok: true, reference: order.reference });
}
