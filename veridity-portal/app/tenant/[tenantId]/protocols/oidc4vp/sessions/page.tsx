import { Oidc4VpConsole } from "@/components/protocol/Oidc4VpConsole";

export default async function Oidc4VpSessionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">OIDC4VP / Sessions</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Verification Session Workbench</h2>
        <p className="mt-2 text-slate-500">Create presentation requests, inspect request_uri documents, and simulate callback submissions.</p>
      </div>
      <Oidc4VpConsole tenantId={tenantId} />
    </div>
  );
}
