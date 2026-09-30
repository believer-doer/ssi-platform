import { Oidc4VciConsole } from "@/components/protocol/Oidc4VciConsole";

export default async function Oidc4VciSessionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">OIDC4VCI / Sessions</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Issuance Session Workbench</h2>
        <p className="mt-2 text-slate-500">Create authorization sessions, exchange codes for access tokens, and inspect credential responses.</p>
      </div>
      <Oidc4VciConsole tenantId={tenantId} />
    </div>
  );
}
