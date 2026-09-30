import { JsonViewer } from "@/components/common/JsonViewer";
import { apiFetch } from "@/lib/api";
import { getSessionContext } from "@/lib/session-context";

export default async function Page() {
  const { jwt, tenantId } = await getSessionContext();
  const jwks = await apiFetch('/{driver}/protocols/oidc4vci/jwks', 'get', { driver: 'internal', tenantId, jwt });
  return <JsonViewer data={jwks} title="OIDC4VCI JWKS" />;
}
