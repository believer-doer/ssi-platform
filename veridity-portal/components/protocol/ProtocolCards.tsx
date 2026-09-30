import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace";
import { hasCapability } from "@/lib/capabilities";

export async function ProtocolCards({ tenantId }: { tenantId: string }) {
  const { roles } = await getWorkspaceContext();
  const cards = [
    {
      title: "OIDC4VCI",
      href: `/tenant/${tenantId}/protocols/oidc4vci`,
      desc: "Issuer-side operator console for discovery, JWKS, issuance authorization, token exchange, credential issuance, and deferred delivery.",
      show: hasCapability(roles, 'protocols:oidc4vci'),
    },
    {
      title: "OIDC4VP",
      href: `/tenant/${tenantId}/protocols/oidc4vp`,
      desc: "Verifier-side operator console for metadata, request generation, request_uri retrieval, callback simulation, and verification result inspection.",
      show: hasCapability(roles, 'protocols:oidc4vp'),
    },
  ].filter((card) => card.show);

  if (cards.length === 0) {
    return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Your current role does not expose protocol operator tools in the portal.</div>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {cards.map((card) => (
        <Link key={card.href} href={card.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="text-lg font-black text-slate-900">{card.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{card.desc}</div>
        </Link>
      ))}
    </div>
  );
}
