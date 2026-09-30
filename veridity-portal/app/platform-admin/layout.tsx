import { getSessionContext } from '@/lib/session-context';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const { roles } = await getSessionContext();
  
  if (!roles.includes('platform-admin')) {
    redirect('/');
  }

  return (
    <div className="p-8">
      {children}
    </div>
  );
}
