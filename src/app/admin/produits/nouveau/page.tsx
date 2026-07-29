import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AdminPageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand } = await searchParams;
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { merchant: { select: { name: true } } } });

  return (
    <>
      <AdminPageHeader title="Nouveau produit" actions={<Link href="/admin/produits" className="btn-outline text-sm">← Produits</Link>} />
      <div className="max-w-3xl">
        <ProductForm product={null} brands={brands} defaultBrandId={brand} />
      </div>
    </>
  );
}
