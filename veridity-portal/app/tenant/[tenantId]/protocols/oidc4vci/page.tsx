import Link from "next/link";

const links = [
  ["Metadata", "metadata", "View credential issuer and authorization server discovery documents."],
  ["JWKS", "jwks", "Inspect the public signing keys exposed by the issuer runtime."],
  ["Sessions", "sessions", "Create issuance sessions, mint access tokens, and call the credential endpoint."],
  ["Deferred", "deferred", "Monitor deferred issuance transaction IDs and inspect delivery responses."],
];

export default async function Oidc4VciHome({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">OIDC4VCI</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Issuer Protocol Console</h2>
        <p className="mt-2 text-slate-500">Operate the public issuance endpoints for tenant <span className="font-mono text-slate-700">{tenantId}</span>.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {links.map(([title, href, desc]) => (
          <Link key={href} href={`/tenant/${tenantId}/protocols/oidc4vci/${href}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-lg font-black text-slate-900">{title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
