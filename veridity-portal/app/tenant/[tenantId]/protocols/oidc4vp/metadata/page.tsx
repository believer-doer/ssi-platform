import { JsonViewer } from "@/components/common/JsonViewer";
import { apiFetch } from "@/lib/api";
import { getSessionContext } from "@/lib/session-context";

export default async function Page() {
  const { jwt, tenantId } = await getSessionContext();
  const metadata = await apiFetch('/{driver}/protocols/oidc4vp/.well-known/openid-configuration', 'get', { driver: 'internal', tenantId, jwt });
  return <JsonViewer data={metadata} title="OIDC4VP openid-configuration" />;
}
