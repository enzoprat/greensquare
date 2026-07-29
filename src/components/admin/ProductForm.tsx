import { saveProduct } from '@/app/admin/actions';

type ProductLike = {
  id: string;
  title: string;
  brandId: string;
  category: string | null;
  sku: string | null;
  ean: string | null;
  imageUrl: string | null;
  shortDesc: string | null;
  description: string | null;
  storageType: string | null;
  unitPriceHtCents: number | null;
  stockUnits: number | null;
  unitsPerCase: number | null;
  casesPerPallet: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'DORMANT';
} | null;

type BrandOption = { id: string; name: string; merchant: { name: string } | null };

const STORAGE = [
  { value: '', label: '—' },
  { value: 'ambient', label: 'Ambiant' },
  { value: 'chilled', label: 'Frais' },
  { value: 'frozen', label: 'Surgelé' },
];

export function ProductForm({ product, brands, defaultBrandId }: { product: ProductLike; brands: BrandOption[]; defaultBrandId?: string }) {
  const priceEuros = product?.unitPriceHtCents != null ? (product.unitPriceHtCents / 100).toFixed(2) : '';
  return (
    <form action={saveProduct} className="card grid gap-4 p-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Titre</label>
          <input name="title" defaultValue={product?.title ?? ''} required className="field" />
        </div>
        <div>
          <label className="label">Marque</label>
          <select name="brandId" defaultValue={product?.brandId ?? defaultBrandId ?? ''} required className="field">
            <option value="" disabled>Choisir…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.merchant ? ` — ${b.merchant.name}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Catégorie</label>
          <input name="category" defaultValue={product?.category ?? ''} className="field" />
        </div>
        <div>
          <label className="label">SKU (code article)</label>
          <input name="sku" defaultValue={product?.sku ?? ''} className="field" />
        </div>
        <div>
          <label className="label">EAN (code-barres)</label>
          <input name="ean" defaultValue={product?.ean ?? ''} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Photo (URL)</label>
          <input name="imageUrl" defaultValue={product?.imageUrl ?? ''} className="field" placeholder="https://…" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label">Prix HT / unité (€)</label>
          <input name="unitPriceHtEuros" defaultValue={priceEuros} inputMode="decimal" className="field" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Stock (unités)</label>
          <input name="stockUnits" type="number" defaultValue={product?.stockUnits ?? ''} className="field" />
        </div>
        <div>
          <label className="label">Unités / colis</label>
          <input name="unitsPerCase" type="number" defaultValue={product?.unitsPerCase ?? ''} className="field" />
        </div>
        <div>
          <label className="label">Colis / palette</label>
          <input name="casesPerPallet" type="number" defaultValue={product?.casesPerPallet ?? ''} className="field" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Conservation</label>
          <select name="storageType" defaultValue={product?.storageType ?? ''} className="field">
            {STORAGE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select name="status" defaultValue={product?.status ?? 'DRAFT'} className="field">
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
            <option value="DORMANT">En sommeil</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Description courte</label>
        <input name="shortDesc" defaultValue={product?.shortDesc ?? ''} className="field" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" defaultValue={product?.description ?? ''} rows={4} className="field" />
      </div>

      <div>
        <button className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}
