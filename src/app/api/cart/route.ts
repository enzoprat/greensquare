import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateCart, buildCartView, addToCart, setCartItem, removeCartItem } from '@/lib/cart';

async function view() {
  const user = await getCurrentUser();
  const cart = await getOrCreateCart(user?.id);
  return NextResponse.json(buildCartView(cart, user?.role));
}

export async function GET() {
  return view();
}

const mutate = z.object({
  op: z.enum(['add', 'set', 'remove']),
  productId: z.string().min(1),
  cases: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const parsed = mutate.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const { op, productId, cases } = parsed.data;

  try {
    if (op === 'add') await addToCart(productId, cases ?? 1, user?.id);
    else if (op === 'set') await setCartItem(productId, cases ?? 0, user?.id);
    else await removeCartItem(productId, user?.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return view();
}
