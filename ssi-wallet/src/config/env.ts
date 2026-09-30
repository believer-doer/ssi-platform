export type BackendDriver = "internal" | "ethereum" | "bitcoin";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeDriver(value: string | undefined): BackendDriver {
  if (value === "ethereum" || value === "bitcoin") {
    return value;
  }

  return "internal";
}

const defaultBackendOrigin = "http://localhost:4000";
const backendOrigin = trimTrailingSlash(process.env.EXPO_PUBLIC_BACKEND_ORIGIN?.trim() || defaultBackendOrigin);
const backendApiBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_BACKEND_API_BASE_URL?.trim() || `${backendOrigin}/v1`,
);
const backendDriver = normalizeDriver(process.env.EXPO_PUBLIC_BACKEND_DRIVER?.trim());

export const walletEnv = {
  backendOrigin,
  backendApiBaseUrl,
  backendDriver,
  issuerMetadataUrl: `${backendApiBaseUrl}/${backendDriver}/protocols/oidc4vci/.well-known/openid-credential-issuer`,
  verifierMetadataUrl: `${backendApiBaseUrl}/${backendDriver}/protocols/oidc4vp/.well-known/openid-configuration`,
};
