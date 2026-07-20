'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = mode === 'login'
      ? { action: 'login', email: fd.get('email'), password: fd.get('password') }
      : { action: 'register', email: fd.get('email'), password: fd.get('password'), firstName: fd.get('firstName'), lastName: fd.get('lastName') };
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { router.push('/catalogue'); router.refresh(); }
    else setError(data.error ?? 'Erreur.');
  };

  return (
    <div className="container-gs max-w-md py-12">
      <h1 className="text-2xl font-semibold">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Les tarifs et la commande sont réservés aux comptes professionnels validés.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === 'register' ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="firstName">Prénom</label><input id="firstName" name="firstName" className="field" /></div>
            <div><label className="label" htmlFor="lastName">Nom</label><input id="lastName" name="lastName" className="field" /></div>
          </div>
        ) : null}
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className="field" /></div>
        <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" required minLength={mode === 'register' ? 8 : 1} className="field" /></div>
        {error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading}>{mode === 'login' ? 'Se connecter' : 'Créer le compte'}</button>
      </form>

      <button className="mt-4 text-sm text-brand hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
        {mode === 'login' ? "Pas de compte ? En créer un" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
}
