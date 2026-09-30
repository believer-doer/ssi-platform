import Link from 'next/link';
import { getWorkspaceContext } from '@/lib/workspace';
import { hasCapability, roleLabel } from '@/lib/capabilities';

export default async function TenantDashboard({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { roles, primaryRole } = await getWorkspaceContext();

  const cards = [
    { title: 'Issuers', href: 'issuers', desc: 'Manage onboarding and lifecycle actions for issuer identities.', show: hasCapability(roles, 'issuers:read') },
    { title: 'Verifiers', href: 'verifiers', desc: 'Operate verifier entities and inspect verification capacity.', show: hasCapability(roles, 'verifiers:read') },
    { title: 'Credentials', href: 'credentials', desc: 'Issue credentials and review issuance results.', show: hasCapability(roles, 'credentials:read') },
    { title: 'Protocols', href: 'protocols', desc: 'Inspect metadata, JWKS, and live protocol sessions for OIDC4VCI and OIDC4VP.', show: hasCapability(roles, 'protocols:view') },
    { title: 'Governance', href: 'governance', desc: 'Review governance proposals and decision history.', show: hasCapability(roles, 'governance:read') },
    { title: 'Revocation', href: 'revocation', desc: 'Inspect revocation lists and revoke issued credentials.', show: hasCapability(roles, 'revocation:read') },
    { title: 'Audit', href: 'audit', desc: 'Review tenant-scoped audit trails and protocol activity.', show: hasCapability(roles, 'audit:read') },
  ].filter((card) => card.show);

  const roleMessages: Record<string, string> = {
    'tenant-admin': 'Full tenant control plane access, including governance and protocol operations.',
    issuer: 'Issuer-focused workspace for credential issuance, schema/template management, and revocation.',
    verifier: 'Verifier-focused workspace for OIDC4VP requests, presentation reviews, and verifier identities.',
    wallet: 'Limited wallet workspace for presentation and holder-oriented flows.',
    auditor: 'Read-only oversight workspace for audit, trust, governance, and protocol diagnostics.',
    'platform-admin': 'Cross-tenant operator context with both platform and tenant surfaces available.',
    worker: 'Worker role has no interactive portal workspace.',
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">Workspace</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">{roleLabel(primaryRole)} Dashboard</h2>
        <p className="mt-2 text-slate-500">Operational workspace for tenant <span className="font-mono text-slate-700">{tenantId}</span>.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Role focus</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{roleMessages[primaryRole ?? ''] ?? 'Use the navigation to access the parts of the control plane available to your role.'}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={`/tenant/${tenantId}/${card.href}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-lg font-black text-slate-900">{card.title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
