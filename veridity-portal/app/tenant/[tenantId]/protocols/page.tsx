import { ProtocolCards } from "@/components/protocol/ProtocolCards";
import { getWorkspaceContext } from '@/lib/workspace';
import { hasCapability } from '@/lib/capabilities';

export default async function ProtocolIndex({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { roles, primaryRole } = await getWorkspaceContext();
  const focusedAreas = [
    hasCapability(roles, 'protocols:oidc4vci') ? 'OIDC4VCI issuance' : null,
    hasCapability(roles, 'protocols:oidc4vp') ? 'OIDC4VP verification' : null,
  ].filter(Boolean).join(' and ');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">Protocol operations</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Protocol Console</h2>
        <p className="mt-2 text-slate-500">Inspect public discovery documents, JWKS, and active runtime flows for tenant <span className="font-mono text-slate-700">{tenantId}</span>.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Role focus</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">Current role <span className="font-semibold text-slate-900">{primaryRole ?? 'unknown'}</span> is primarily mapped to {focusedAreas || 'read-only protocol visibility'} in the portal.</p>
      </div>
      <ProtocolCards tenantId={tenantId} />
    </div>
  );
}
