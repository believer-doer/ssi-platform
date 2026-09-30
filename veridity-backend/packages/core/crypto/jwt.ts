import jwt from "jsonwebtoken";

export function signJWT(payload: any, secret: string, options?: jwt.SignOptions) {
  return jwt.sign(payload, secret, options);
}

export function verifyJWT(token: string, secret: string) {
  return jwt.verify(token, secret);
}

export function signVcJwt(payload: {
  issuerDid: string;
  holderDid?: string;
  schemaId: string;
  claims: Record<string, unknown>;
}, secret: string) {
  return signJWT(
    {
      iss: payload.issuerDid,
      sub: payload.holderDid,
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        credentialSchema: {
          id: payload.schemaId,
          type: "JsonSchemaValidator2018",
        },
        credentialSubject: payload.claims,
      },
    },
    secret,
    { algorithm: "HS256" },
  );
}

export function verifyVcJwt(token: string, secret: string) {
  const decoded = verifyJWT(token, secret) as any;
  return {
    valid: !!decoded?.iss && !!decoded?.vc?.credentialSubject,
    payload: decoded,
  };
}
