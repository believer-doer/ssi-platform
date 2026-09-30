import { JsonViewer } from "@/components/common/JsonViewer";
import { apiFetch } from "@/lib/api";
import { getSessionContext } from "@/lib/session-context";

export default async function Page() {
  const { jwt, tenantId } = await getSessionContext();
  const [issuerMetadata, authServerMetadata] = await Promise.all([
    apiFetch('/{driver}/protocols/oidc4vci/.well-known/openid-credential-issuer', 'get', { driver: 'internal', tenantId, jwt }),
    apiFetch('/{driver}/protocols/oidc4vci/.well-known/openid-configuration', 'get', { driver: 'internal', tenantId, jwt }),
  ]);
  return <div className="space-y-6"><JsonViewer data={issuerMetadata} title="openid-credential-issuer" /><JsonViewer data={authServerMetadata} title="openid-configuration" /></div>;
}
