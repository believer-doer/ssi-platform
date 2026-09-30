import { FastifyPluginAsync } from "fastify";
import { getDatabaseStatus } from "@ssi/driver-internal";
import { driverRegistry } from "@ssi/plugins";
import { SSIDriver } from "@ssi/core/interfaces/driver.interface";

type DriverName = keyof typeof driverRegistry;

function getBooleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];
  if (typeof value !== "string") {
    return defaultValue;
  }

  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function summarizeDriver(driver: DriverName) {
  const instance = driverRegistry[driver] as unknown as SSIDriver & {
    hasRegistryClient?: boolean;
    hasAnchorClient?: boolean;
  };
  const enabled =
    driver === "internal"
      ? true
      : driver === "ethereum"
        ? getBooleanEnv("ENABLE_ETHEREUM", true)
        : getBooleanEnv("ENABLE_BITCOIN", false);

  const details: Record<string, unknown> =
    driver === "internal"
      ? {
        storage: "mongodb",
      }
      : driver === "ethereum"
        ? {
          rpcUrl: process.env.ETH_NODE_URL,
          chainId: process.env.ETH_CHAIN_ID ? Number(process.env.ETH_CHAIN_ID) : undefined,
          registryAddress: process.env.ETH_REGISTRY_ADDRESS,
          registryConfigured: Boolean(instance.hasRegistryClient),
        }
        : {
          nodeUrl: process.env.BTC_NODE_URL,
          network: process.env.BTC_NETWORK,
          walletName: process.env.BTC_WALLET_NAME,
          anchorConfigured: Boolean(instance.hasAnchorClient),
        };

  const configured =
    driver === "internal"
      ? true
      : driver === "ethereum"
        ? Boolean(details.rpcUrl && details.registryAddress)
        : Boolean(details.nodeUrl && details.walletName && details.network);

  const ready = enabled ? configured : true;

  return {
    id: driver,
    driver,
    name: driver.charAt(0).toUpperCase() + driver.slice(1).replace("-", " ") + " Driver",
    enabled,
    configured,
    ready,
    summary:
      !enabled
        ? `${driver} support is disabled in the current environment.`
        : ready
          ? `${driver} runtime is configured and available to the API.`
          : `${driver} support is enabled, but required runtime settings are missing.`,
    details,
    capabilities: instance.capabilities,
  };
}

const systemModule: FastifyPluginAsync = async (fastify) => {
  fastify.get("/system/health", async (_request) => {
    const database = getDatabaseStatus();
    const status = database.ok ? "healthy" : "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };
  });

  fastify.get("/system/status", async (request) => {
    const database = getDatabaseStatus();
    const drivers = (Object.keys(driverRegistry) as DriverName[]).map(summarizeDriver);
    const healthyDrivers = drivers.filter((driver) => driver.ready).length;
    const status =
      database.ok && healthyDrivers === drivers.length ? "healthy" : "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      service: {
        name: "veridity-api",
        nodeEnv: process.env.NODE_ENV ?? "development",
        authRequired: getBooleanEnv("CONTROL_PLANE_AUTH_REQUIRED", false),
        tenantRequired: getBooleanEnv("CONTROL_PLANE_TENANT_REQUIRED", false),
      },
      database,
      drivers,
      session: {
        authenticated: request.authContext.authenticated,
        subject: request.authContext.subject,
        tenantId: request.authContext.tenantId,
        roles: request.authContext.roles,
      },
    };
  });

  fastify.get("/system/session", async (request) => {
    return {
      authenticated: request.authContext.authenticated,
      subject: request.authContext.subject,
      tenantId: request.authContext.tenantId,
      roles: request.authContext.roles,
      authRequired: getBooleanEnv("CONTROL_PLANE_AUTH_REQUIRED", false),
      tenantRequired: getBooleanEnv("CONTROL_PLANE_TENANT_REQUIRED", false),
      timestamp: new Date().toISOString(),
    };
  });
};

export default systemModule;
