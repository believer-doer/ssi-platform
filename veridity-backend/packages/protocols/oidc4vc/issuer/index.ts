import { SSIDriver } from "@ssi/core/interfaces/driver.interface";

export class OIDC4VCIssuer {
  driver: SSIDriver;

  constructor(driver: SSIDriver) {
    this.driver = driver;
  }

  async createCredentialRequest(payload: {
    issuerDid: string;
    schemaId: string;
    format: "vc-jwt" | "vc-ldp" | "sd-jwt-vc" | "bbs-vc";
    subject: Record<string, unknown>;
    holderDid: string;
    tenantId?: string;
    callbackUrl?: string;
  }) {
    const session = await this.driver.protocol?.createSession?.("oidc4vci", {
      tenantId: payload.tenantId,
      issuerDid: payload.issuerDid,
      holderDid: payload.holderDid,
      schemaId: payload.schemaId,
      format: payload.format,
      callbackUrl: payload.callbackUrl,
      claims: payload.subject,
    });

    const issued = this.driver.credential
      ? await this.driver.credential.issue({
          tenantId: payload.tenantId,
          issuerDid: payload.issuerDid,
          holderDid: payload.holderDid,
          format: payload.format,
          schema: { id: payload.schemaId },
          claims: payload.subject,
          issuanceProtocol: "oidc4vci",
        })
      : await this.driver.issueCredential({
          schemaId: payload.schemaId,
          subject: payload.subject,
          issuer: payload.issuerDid,
          format: payload.format,
          holderDid: payload.holderDid,
        });

    return {
      session,
      credential: this.driver.credential ? issued.credential : issued,
      redirect_uri: payload.callbackUrl,
      deep_link: session?.deepLink,
      qr_payload: session?.qrPayload,
      state: session?.id ?? Date.now(),
    };
  }

  async verifyCredentialResponse(response: any) {
    if (this.driver.credential) {
      return this.driver.credential.verify({
        credential: response.credential,
        format: response.format ?? "vc-jwt",
        resolveStatus: true,
      });
    }
    return this.driver.verifyCredential(response.credential);
  }
}
