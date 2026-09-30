import { ReactNode } from 'react';
import { requireAnyCapability } from '@/lib/guards';

export default async function Oidc4VciLayout({ children }: { children: ReactNode }) {
  await requireAnyCapability(['protocols:oidc4vci']);
  return <>{children}</>;
}
