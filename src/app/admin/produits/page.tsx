import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatEurFromCents } from '@/lib/b2b';
import { AdminPageHeader, Table, THead, TH, TD, TR, StatusPill, EmptyRow } from '@/components/admin/ui';
import { setProductStatus } from '../actions';

const STATUS_META = {
  ACTIVE: { label: 'Actif', tone: 'green' },
  DRAFT: { label: 'Brouillon', tone: 'amber' },
  DORMANT: { label: 'En sommeil', tone: 'neutral' },
} as const;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ status?: string; brand?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {};
  if (sp.status && ['ACTIVE', 'DRAFT', 'DORMANT'].includes(sp.status)) where.status = sp.status as 'ACTIVE' | 'DRAFT' | 'DORMANT';
  if (sp.brand) where.brandId = sp.brand;
  if (sp.q) where.OR = [{ title: { contains: sp.q, mode: 'insensitive' } }, { sku: { contains: sp.q, mode: 'insensitive' } }];

  const [products, brands] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { brand: true }, take: 300 }),
    prisma.brand.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Produits"
        subtitle={`${products.length} produit(s) affiché(s).`}
        actions={<Link href="/admin/produits/nouveau" className="btn-primary text-sm">+ Nouveau produit</Link>}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Rechercher (titre, SKU)…" className="field w-auto flex-1 min-w-[160px]" />
        <select name="status" defaultValue={sp.status ?? ''} className="field w-auto">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="DRAFT">Brouillons</option>
          <option value="DORMANT">En sommeil</option>
        </select>
        <select name="brand" defaultValue={sp.brand ?? ''} className="field w-auto">
          <option value="">Toutes marques</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn-outline text-sm">Filtrer</button>
      </form>

      <Table>
        <THead>
          <TR>
            <TH></TH>
            <TH>Article</TH>
            <TH>SKU</TH>
            <TH className="text-right">Prix HT</TH>
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {products.length === 0 ? (
            <EmptyRow colSpan={6}>Aucun produit.</EmptyRow>
          ) : (
            products.map((p) => (
              <TR key={p.id}>
                <TD>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-10 w-10 rounded border border-line object-contain" />
                  ) : <div className="h-10 w-10 rounded border border-line bg-surface-muted" />}
                </TD>
                <TD>
                  <div className="font-medium text-ink">{p.title}</div>
                  <div className="text-xs text-ink-faint">{p.brand.name}</div>
                </TD>
                <TD className="whitespace-nowrap">{p.sku || '—'}</TD>
                <TD className="text-right">{p.unitPriceHtCents != null ? formatEurFromCents(p.unitPriceHtCents) : '—'}</TD>
                <TD><StatusPill label={STATUS_META[p.status].label} tone={STATUS_META[p.status].tone} /></TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    {p.status !== 'ACTIVE' ? (
                      <form action={setProductStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="ACTIVE" />
                        <button className="text-xs text-brand hover:underline">Activer</button>
                      </form>
                    ) : null}
                    {p.status !== 'DORMANT' ? (
                      <form action={setProductStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="DORMANT" />
                        <button className="text-xs text-ink-soft hover:underline">Sommeil</button>
                      </form>
                    ) : null}
                    <Link href={`/admin/produits/${p.id}`} className="text-xs text-brand hover:underline">Éditer</Link>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
