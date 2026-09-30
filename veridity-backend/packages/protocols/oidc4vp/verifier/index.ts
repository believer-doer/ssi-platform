import { SSIDriver } from "@ssi/core/interfaces/driver.interface";

export class OIDC4VPVerifier {
  driver: SSIDriver;

  constructor(driver: SSIDriver) {
    this.driver = driver;
  }

  async requestPresentation(
    holderDid: string,
    requiredSchemas: string[],
    verifierDid = "verifier:unknown",
  ) {
    const session = await this.driver.protocol?.createSession?.("oidc4vp", {
      holderDid,
      verifierDid,
      requiredSchemas,
      challenge: `${Date.now()}`,
    });

    return {
      session,
      holder: holderDid,
      requestedSchemas: requiredSchemas,
      challenge: session?.challenge ?? Date.now(),
      deep_link: session?.deepLink,
      qr_payload: session?.qrPayload,
    };
  }

  async verifyPresentation(vp: any) {
    if (this.driver.presentation) {
      return this.driver.presentation.verify({
        presentation: vp,
        format: "mixed",
        challenge: vp?.challenge,
        domain: vp?.domain,
        resolveStatus: true,
        verifyTrustChain: true,
      });
    }
    return this.driver.verifyPresentation(vp);
  }
}
