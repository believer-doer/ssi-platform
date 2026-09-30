import { getWorkspaceContext } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const { isPlatformAdmin, isTenantOperator } = await getWorkspaceContext();

  if (!isTenantOperator && !isPlatformAdmin) {
    redirect('/');
  }

  return <div className="p-8">{children}</div>;
}
