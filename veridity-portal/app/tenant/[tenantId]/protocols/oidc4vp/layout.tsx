import { ReactNode } from 'react';
import { requireAnyCapability } from '@/lib/guards';

export default async function Oidc4VpLayout({ children }: { children: ReactNode }) {
  await requireAnyCapability(['protocols:oidc4vp']);
  return <>{children}</>;
}
