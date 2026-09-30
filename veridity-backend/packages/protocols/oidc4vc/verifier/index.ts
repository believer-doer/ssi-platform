import { SSIDriver } from "@ssi/core/interfaces/driver.interface";

export class OIDC4VCVerifier {
  driver: SSIDriver;

  constructor(driver: SSIDriver) {
    this.driver = driver;
  }

  async verifyPresentation(presentation: any) {
    if (this.driver.presentation) {
      return this.driver.presentation.verify({
        presentation,
        format: "mixed",
        resolveStatus: true,
        verifyTrustChain: true,
      });
    }
    return this.driver.verifyPresentation(presentation);
  }
}
