export const DRIVER_TYPES = {
  INTERNAL: "internal",
  ETHEREUM: "ethereum",
  BITCOIN: "bitcoin",
} as const;

export const VC_FORMATS = {
  JWT: "jwt",
  JSONLD: "jsonld",
  SDJWT: "sd-jwt",
  BBS: "bbs",
} as const;

export const PROTOCOLS = {
  OIDC4VC: "oidc4vc",
  OIDC4VP: "oidc4vp",
  DIDCOMM: "didcomm",
} as const;
