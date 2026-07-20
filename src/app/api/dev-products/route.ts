import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';

/**
 * Test-only helper to obtain product ids for e2e scripts. Disabled in production.
 * Still routes through the price-gating DTO, so it never leaks prices to non-pro.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const user = await getCurrentUser();
  const products = await getCatalog({ availableOnly: true }, user?.role);
  return NextResponse.json({
    products: products.slice(0, 40).map((p) => ({
      id: p.id, title: p.title, handle: p.handle,
      unitsPerCase: p.unitsPerCase, casesPerPallet: p.casesPerPallet,
      caseOrderStep: p.caseOrderStep, minimumCases: p.minimumCases,
      availableCases: p.availableCases, unitPriceHtCents: p.unitPriceHtCents,
      canSeePrice: p.canSeePrice,
    })),
  });
}
