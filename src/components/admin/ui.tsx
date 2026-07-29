import Link from 'next/link';
import type { ReactNode } from 'react';

/** Page header with title + optional actions on the right. */
export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Simple metric card for the dashboard. */
export function StatCard({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const inner = (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

/** Table wrapper — gives the bordered/rounded card look. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-faint">{children}</thead>;
}
export function TH({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}
export function TD({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
export function TR({ children }: { children: ReactNode }) {
  return <tr className="border-b border-line last:border-0">{children}</tr>;
}

/** Coloured status pill. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-muted text-ink-soft',
    green: 'bg-brand-light text-brand-dark',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{label}</span>;
}

/** Empty-state row helper. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-ink-soft">{children}</td>
    </tr>
  );
}
