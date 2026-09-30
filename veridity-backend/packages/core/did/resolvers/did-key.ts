export async function resolveKeyDID(did: string) {
  const publicKey = did.split(":").pop();
  return {
    id: did,
    verificationMethod: [
      {
        id: `${did}#keys-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase: publicKey,
      },
    ],
    authentication: [`${did}#keys-1`],
    assertionMethod: [`${did}#keys-1`],
  };
}
