export async function resolveWebDID(did: string) {
  const path = did.replace("did:web:", "").replace(/:/g, "/");
  const origin = path.startsWith("http") ? path : `https://${path}`;

  return {
    id: did,
    service: [
      {
        id: `${did}#origin`,
        type: "LinkedDomains",
        serviceEndpoint: origin,
      },
    ],
  };
}
