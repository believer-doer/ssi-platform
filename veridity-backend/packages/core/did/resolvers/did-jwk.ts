export async function resolveJwkDID(did: string) {
  const encoded = did.replace("did:jwk:", "");
  const jwk = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));

  return {
    id: did,
    verificationMethod: [
      {
        id: `${did}#keys-1`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: jwk,
      },
    ],
    authentication: [`${did}#keys-1`],
    assertionMethod: [`${did}#keys-1`],
  };
}
