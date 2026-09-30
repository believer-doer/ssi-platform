import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '@/lib/workspace';

export default async function Home() {
  const { jwt, roles, tenantId, baseTenantPath } = await getWorkspaceContext();

  if (!jwt) {
    redirect('/login');
  }

  if (roles.includes('platform-admin')) {
    redirect('/platform-admin/tenants');
  }

  if (roles.some(r => ['tenant-admin', 'issuer', 'verifier', 'wallet', 'auditor'].includes(r))) {
    redirect(`${baseTenantPath}/dashboard`);
  }

  if (roles.includes('worker')) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Worker Access</h1>
          <p className="text-slate-500 font-medium">This role has no portal workspace. Use the control-plane API or worker queue for operations.</p>
          <p className="text-xs font-mono text-slate-400">tenant={tenantId ?? 'n/a'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Veridity Portal</h1>
        <p className="text-slate-500 font-medium">Session active but no assigned UI role. Please contact support.</p>
      </div>
    </main>
  );
}
