import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import { AdminSidebar } from '@/components/admin/Sidebar';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-gs py-8">
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Administration</div>
          <AdminSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
