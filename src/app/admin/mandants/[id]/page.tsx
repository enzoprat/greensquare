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
              <form key={b.id} action={saveBrand} className="card flex flex-wrap items-center gap-2 p-3">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="merchantId" value={merchant.id} />
                <input type="hidden" name="backTo" value={backTo} />
                <input name="name" defaultValue={b.name} className="field flex-1 min-w-[120px]" />
                <input name="logoUrl" defaultValue={b.logoUrl ?? ''} placeholder="Logo URL" className="field flex-1 min-w-[120px]" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={b.active} /> Actif</label>
                <span className="text-xs text-ink-faint">{b._count.products} prod.</span>
                <Link href={`/admin/produits?brand=${b.id}`} className="text-xs text-brand hover:underline">Produits</Link>
                <button className="btn-outline px-3 py-1 text-xs">Enregistrer</button>
              </form>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-medium text-ink">Ajouter une marque</h3>
          <form action={saveBrand} className="card flex flex-wrap items-end gap-2 p-3">
            <input type="hidden" name="merchantId" value={merchant.id} />
            <input type="hidden" name="backTo" value={backTo} />
            <input name="name" placeholder="Nom de la marque" required className="field flex-1 min-w-[140px]" />
            <input name="logoUrl" placeholder="Logo URL (option.)" className="field flex-1 min-w-[140px]" />
            <input type="hidden" name="active" value="on" />
            <button className="btn-primary px-3 py-2 text-sm">Ajouter</button>
          </form>
        </section>
      </div>
    </>
  );
}
