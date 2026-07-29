'use client';

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary text-sm no-print">
      Imprimer / Enregistrer en PDF
    </button>
  );
}
