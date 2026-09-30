import Link from "next/link";

const links = [
  ["Metadata", "metadata", "Inspect verifier openid-configuration and public callback details."],
  ["JWKS", "jwks", "Inspect verifier public keys for request and callback validation."],
  ["Sessions", "sessions", "Create verifier requests and monitor verification sessions."],
  ["Requests", "requests", "Build request_uri payloads and simulate callback submissions."],
];

export default async function Oidc4VpHome({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">OIDC4VP</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Verifier Protocol Console</h2>
        <p className="mt-2 text-slate-500">Operate presentation request and callback flows for tenant <span className="font-mono text-slate-700">{tenantId}</span>.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {links.map(([title, href, desc]) => (
          <Link key={href} href={`/tenant/${tenantId}/protocols/oidc4vp/${href}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-lg font-black text-slate-900">{title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
