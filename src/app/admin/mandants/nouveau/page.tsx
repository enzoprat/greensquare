import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/ui';
import { MerchantForm } from '@/components/admin/MerchantForm';

export default function NewMerchantPage() {
  return (
    <>
      <AdminPageHeader title="Nouveau mandant" actions={<Link href="/admin/mandants" className="btn-outline text-sm">← Mandants</Link>} />
      <div className="max-w-xl">
        <MerchantForm merchant={null} />
      </div>
    </>
  );
}
