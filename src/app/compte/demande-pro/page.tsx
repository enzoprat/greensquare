'use client';

import { useState } from 'react';

const FIELDS: { name: string; label: string; type?: string; required?: boolean; half?: boolean }[] = [
  { name: 'companyName', label: 'Raison sociale', required: true },
  { name: 'tradeName', label: 'Nom commercial' },
  { name: 'firstName', label: 'Prénom', required: true, half: true },
  { name: 'lastName', label: 'Nom', required: true, half: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true, half: true },
  { name: 'phone', label: 'Téléphone', required: true, half: true },
  { name: 'address', label: 'Adresse', required: true },
  { name: 'postalCode', label: 'Code postal', required: true, half: true },
  { name: 'city', label: 'Ville', required: true, half: true },
  { name: 'country', label: 'Pays', required: true, half: true },
  { name: 'siret', label: 'SIRET', required: true, half: true },
  { name: 'vatNumber', label: 'TVA intracommunautaire', half: true },
  { name: 'activity', label: 'Activité', half: true },
  { name: 'estimatedVolume', label: 'Volume estimé' },
];

export default function ProRequestPage() {
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) body[k] = v;
    body.consent = fd.get('consent') === 'on';
    const res = await fetch('/api/pro-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setLoading(false);
    if (res.ok) setState('ok');
    else { const d = await res.json(); setError(d.error ?? 'Erreur.'); setState('error'); }
  };

  if (state === 'ok') {
    return (
      <div className="container-gs max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">Demande envoyée</h1>
        <p className="mt-2 text-ink-soft">Votre demande d&apos;ouverture de compte professionnel a été transmise. Après validation manuelle, vous accéderez aux tarifs et à la commande.</p>
      </div>
    );
  }

  return (
    <div className="container-gs max-w-2xl py-10">
      <h1 className="text-2xl font-semibold">Demande d&apos;ouverture de compte professionnel</h1>
      <p className="mt-1 text-sm text-ink-soft">Connectez-vous d&apos;abord pour associer la demande à votre compte. La validation est manuelle.</p>

      <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.name} className={f.half ? 'col-span-1' : 'col-span-2'}>
            <label className="label" htmlFor={f.name}>{f.label}{f.required ? ' *' : ''}</label>
            <input id={f.name} name={f.name} type={f.type ?? 'text'} required={f.required} className="field" />
          </div>
        ))}
        <div className="col-span-2">
          <label className="label" htmlFor="message">Message (facultatif)</label>
          <textarea id="message" name="message" rows={3} className="field" />
        </div>
        <label className="col-span-2 flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>J&apos;accepte la politique de confidentialité et le traitement de mes données pour l&apos;étude de ma demande.</span>
        </label>
        {error ? <p className="col-span-2 rounded-control bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="col-span-2">
          <button className="btn-primary" disabled={loading}>Envoyer la demande</button>
        </div>
      </form>
    </div>
  );
}
