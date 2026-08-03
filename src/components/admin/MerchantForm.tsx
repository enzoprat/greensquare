import { saveMerchant } from '@/app/admin/actions';
import { ImageFileInput } from './ImageFileInput';

type MerchantLike = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  active: boolean;
  displayOrder: number;
} | null;

export function MerchantForm({ merchant }: { merchant: MerchantLike }) {
  const logo = merchant?.logoUrl ?? null;
  // Don't dump an uploaded (base64) logo into the URL text field.
  const logoUrlValue = logo && !logo.startsWith('data:') ? logo : '';
  return (
    <form action={saveMerchant} className="card grid gap-4 p-5">
      {merchant ? <input type="hidden" name="id" value={merchant.id} /> : null}
      <div>
        <label className="label">Nom du mandant</label>
        <input name="name" defaultValue={merchant?.name ?? ''} required className="field" />
      </div>
      <div>
        <label className="label">Logo</label>
        {logo ? (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Logo actuel" className="h-12 max-w-[120px] rounded border border-line object-contain" />
            <span className="text-xs text-ink-faint">Logo actuel</span>
          </div>
        ) : null}
        <ImageFileInput name="logoFile" />
        <p className="mt-1 text-xs text-ink-faint">PNG, JPG, WEBP ou SVG · max 10 Mo. Ou collez une URL ci-dessous.</p>
      </div>
      <div>
        <label className="label">Logo (URL, alternative au fichier)</label>
        <input name="logoUrl" defaultValue={logoUrlValue} className="field" placeholder="https://…" />
      </div>
      <div>
        <label className="label">Site web</label>
        <input name="website" defaultValue={merchant?.website ?? ''} className="field" placeholder="https://…" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" defaultValue={merchant?.description ?? ''} rows={3} className="field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Ordre d'affichage</label>
          <input name="displayOrder" type="number" defaultValue={merchant?.displayOrder ?? 0} className="field" />
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="active" defaultChecked={merchant?.active ?? true} />
          Actif (visible sur le site)
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}
