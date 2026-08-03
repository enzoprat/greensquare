'use client';

import { useState } from 'react';

// Kept in sync with IMAGE_TYPES / IMAGE_MAX_BYTES in src/app/admin/actions.ts.
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

/**
 * File input that validates type + size on the client BEFORE submit. This keeps
 * an oversized/invalid file from ever reaching the Server Action (which would
 * otherwise throw and surface as a generic server error on Vercel).
 */
export function ImageFileInput({
  name,
  className = '',
  inputClassName = 'field w-full',
}: {
  name: string;
  className?: string;
  inputClassName?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={className}>
      <input
        name={name}
        type="file"
        accept={TYPES.join(',')}
        className={inputClassName}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (!f) return setError(null);
          if (!TYPES.includes(f.type)) {
            setError('Format non supporté. Utilisez PNG, JPG, WEBP ou SVG.');
            e.currentTarget.value = '';
            return;
          }
          if (f.size > MAX_BYTES) {
            setError(`Image trop lourde (${(f.size / 1024 / 1024).toFixed(1)} Mo). Maximum 10 Mo.`);
            e.currentTarget.value = '';
            return;
          }
          setError(null);
        }}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
