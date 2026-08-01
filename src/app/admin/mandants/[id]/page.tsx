import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AdminPageHeader } from '@/components/admin/ui';
import { MerchantForm } from '@/components/admin/MerchantForm';
import { saveBrand } from '../../actions';

export default async function EditMerchantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      brands: {
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: true } } },
      },
    },
  });
  if (!merchant) notFound();
  const backTo = `/admin/mandants/${merchant.id}`;

  return (
    <>
      <AdminPageHeader
        title={merchant.name}
        subtitle="Éditez le mandant, ses marques et leurs produits."
        actions={<Link href="/admin/mandants" className="btn-outline text-sm">← Mandants</Link>}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Fiche mandant</h2>
          <MerchantForm merchant={merchant} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Marques ({merchant.brands.length})</h2>
          <div className="space-y-2">
            {merchant.brands.map((b) => (
              <form key={b.id} action={saveBrand} className="card grid gap-2 p-3">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="merchantId" value={merchant.id} />
                <input type="hidden" name="backTo" value={backTo} />
                <div className="flex flex-wrap items-center gap-2">
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt={`Logo ${b.name}`} className="h-9 w-9 shrink-0 rounded border border-line object-contain" />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded border border-dashed border-line text-[10px] text-ink-faint">logo</span>
                  )}
                  <input name="name" defaultValue={b.name} className="field flex-1 min-w-[120px]" />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={b.active} /> Actif</label>
                  <span className="text-xs text-ink-faint">{b._count.products} prod.</span>
                  <Link href={`/admin/produits?brand=${b.id}`} className="text-xs text-brand hover:underline">Produits</Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="field flex-1 min-w-[160px] text-xs" />
                  <input name="logoUrl" defaultValue={b.logoUrl && !b.logoUrl.startsWith('data:') ? b.logoUrl : ''} placeholder="ou Logo URL" className="field flex-1 min-w-[120px]" />
                  <button className="btn-outline px-3 py-1 text-xs">Enregistrer</button>
                </div>
              </form>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-medium text-ink">Ajouter une marque</h3>
          <form action={saveBrand} className="card grid gap-2 p-3">
            <input type="hidden" name="merchantId" value={merchant.id} />
            <input type="hidden" name="backTo" value={backTo} />
            <input name="name" placeholder="Nom de la marque" required className="field" />
            <div className="flex flex-wrap items-center gap-2">
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="field flex-1 min-w-[160px] text-xs" />
              <input name="logoUrl" placeholder="ou Logo URL (option.)" className="field flex-1 min-w-[140px]" />
            </div>
            <input type="hidden" name="active" value="on" />
            <button className="btn-primary px-3 py-2 text-sm justify-self-start">Ajouter</button>
          </form>
        </section>
      </div>
    </>
  );
}
