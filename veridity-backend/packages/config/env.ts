import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const optionalNonEmptyString = z.string().min(1).optional();
const portFromEnv = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return value;
  }

  return Number(value);
}, z.number().int().min(1).max(65535));

const positiveIntFromEnv = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return value;
  }

  return Number(value);
}, z.number().int().positive());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),

    PORT: portFromEnv.default(4000),
    HOST: z.string().min(1).default("0.0.0.0"),
    ENABLE_DEBUG: booleanFromEnv.default(false),

    MONGO_URI: z
      .string()
      .min(1, "MONGO_URI is required")
      .refine(
        (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
        "MONGO_URI must start with mongodb:// or mongodb+srv://",
      ),

    REDIS_HOST: z.string().min(1).default("127.0.0.1"),
    REDIS_PORT: portFromEnv.default(6379),

    JWT_SIGNING_KEY: z.string().min(1, "JWT_SIGNING_KEY is required"),
    SD_JWT_KEY: z.string().min(1, "SD_JWT_KEY is required"),
    BBS_PRIVATE_KEY: z.string().min(1, "BBS_PRIVATE_KEY is required"),
    KEY_SECRET: z.string().min(1).default("dev-key-secret"),

    CONTROL_PLANE_JWT_SECRET: z.string().min(1).default("dev-control-plane-secret"),
    CONTROL_PLANE_AUTH_REQUIRED: booleanFromEnv.default(false),
    CONTROL_PLANE_TENANT_REQUIRED: booleanFromEnv.default(false),

    ENABLE_ETHEREUM: booleanFromEnv.default(true),
    ETH_NODE_URL: optionalNonEmptyString,
    ETH_PRIVATE_KEY: optionalNonEmptyString,
    ETH_CHAIN_ID: positiveIntFromEnv.optional(),
    ETH_REGISTRY_ADDRESS: optionalNonEmptyString,
    ETH_REGISTRY_DEPLOY_BLOCK: positiveIntFromEnv.optional(),

    ENABLE_BITCOIN: booleanFromEnv.default(false),
    BTC_NODE_URL: optionalNonEmptyString,
    BTC_WALLET_NAME: optionalNonEmptyString,
    BTC_NETWORK: optionalNonEmptyString,

    OIDC_ISSUER_URL: z.string().url().default("http://localhost:4000"),
    OIDC_CLIENT_ID: z.string().min(1).default("ssi-platform-client"),
    OIDC_CLIENT_SECRET: z.string().min(1).default("ssi-platform-secret"),
    OIDC_REDIRECT_URI: z.string().url().default("http://localhost:4000/callback"),
    OIDC_VP_CLIENT_ID: z.string().min(1).default("ssi-platform-vp-client"),
    OIDC_VP_REDIRECT_URI: z
      .string()
      .url()
      .default("http://localhost:4000/vp/callback"),

    ENABLE_DIDCOMM: booleanFromEnv.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.ENABLE_ETHEREUM) {
      if (!env.ETH_NODE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ETH_NODE_URL"],
          message: "Required when ENABLE_ETHEREUM=true",
        });
      }
      if (!env.ETH_PRIVATE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ETH_PRIVATE_KEY"],
          message: "Required when ENABLE_ETHEREUM=true",
        });
      }
      if (!env.ETH_REGISTRY_ADDRESS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ETH_REGISTRY_ADDRESS"],
          message: "Required when ENABLE_ETHEREUM=true",
        });
      }
    }

    if (env.ENABLE_BITCOIN) {
      for (const key of ["BTC_NODE_URL", "BTC_WALLET_NAME", "BTC_NETWORK"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: "Required when ENABLE_BITCOIN=true",
          });
        }
      }
    }

    if (env.NODE_ENV === "production") {
      if (env.KEY_SECRET === "dev-key-secret") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["KEY_SECRET"],
          message: "Do not use the default KEY_SECRET in production",
        });
      }

      if (env.CONTROL_PLANE_JWT_SECRET === "dev-control-plane-secret") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTROL_PLANE_JWT_SECRET"],
          message: "Do not use the default CONTROL_PLANE_JWT_SECRET in production",
        });
      }

      if (!env.CONTROL_PLANE_AUTH_REQUIRED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTROL_PLANE_AUTH_REQUIRED"],
          message: "Must be enabled in production",
        });
      }
    }
  });

function formatValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const key = issue.path.length > 0 ? issue.path.join(".") : "env";
      return `- ${key}: ${issue.message}`;
    })
    .join("\n");
}

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration.\n${formatValidationError(parsed.error)}\n\n` +
        "Update your .env file using .env.example as a reference.",
    );
  }

  const data = parsed.data;

  return {
    nodeEnv: data.NODE_ENV,
    port: data.PORT,
    host: data.HOST,
    enableDebug: data.ENABLE_DEBUG,

    mongoUri: data.MONGO_URI,
    redisHost: data.REDIS_HOST,
    redisPort: data.REDIS_PORT,

    jwtKey: data.JWT_SIGNING_KEY,
    sdJwtKey: data.SD_JWT_KEY,
    bbsPrivateKey: data.BBS_PRIVATE_KEY,
    keySecret: data.KEY_SECRET,

    controlPlaneJwtSecret: data.CONTROL_PLANE_JWT_SECRET,
    controlPlaneAuthRequired: data.CONTROL_PLANE_AUTH_REQUIRED,
    controlPlaneTenantRequired: data.CONTROL_PLANE_TENANT_REQUIRED,

    enableEthereum: data.ENABLE_ETHEREUM,
    ethNodeUrl: data.ETH_NODE_URL,
    ethPrivateKey: data.ETH_PRIVATE_KEY,
    ethChainId: data.ETH_CHAIN_ID,
    ethRegistryAddress: data.ETH_REGISTRY_ADDRESS,
    ethRegistryDeployBlock: data.ETH_REGISTRY_DEPLOY_BLOCK,

    enableBitcoin: data.ENABLE_BITCOIN,
    btcNodeUrl: data.BTC_NODE_URL,
    btcWalletName: data.BTC_WALLET_NAME,
    btcNetwork: data.BTC_NETWORK,

    oidcIssuerUrl: data.OIDC_ISSUER_URL,
    oidcClientId: data.OIDC_CLIENT_ID,
    oidcClientSecret: data.OIDC_CLIENT_SECRET,
    oidcRedirectUri: data.OIDC_REDIRECT_URI,
    oidcVpClientId: data.OIDC_VP_CLIENT_ID,
    oidcVpRedirectUri: data.OIDC_VP_REDIRECT_URI,

    enableDidcomm: data.ENABLE_DIDCOMM,
  };
}

export const env = loadEnv();
export type Env = typeof env;
