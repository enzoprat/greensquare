import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AdminPageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';
import { deleteProduct } from '../../actions';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { merchant: { select: { name: true } } } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader
        title="Éditer le produit"
        subtitle={product.title}
        actions={
          <>
            <Link href="/admin/produits" className="btn-outline text-sm">← Produits</Link>
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button className="btn-outline border-red-300 text-sm text-red-700 hover:border-red-500">Supprimer</button>
            </form>
          </>
        }
      />
      <div className="max-w-3xl">
        <ProductForm product={product} brands={brands} />
      </div>
    </>
  );
}
