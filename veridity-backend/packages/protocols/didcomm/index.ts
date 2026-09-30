// packages/protocols/didcomm/index.ts
import { SSIDriver } from "@ssi/core/interfaces/driver.interface";

export class DIDComm {
  constructor(private readonly driver?: SSIDriver) {}

  async sendMessage(toDid: string, message: any, fromDid?: string) {
    const session = await this.driver?.protocol?.createSession?.("didcomm-v2", {
      holderDid: toDid,
      issuerDid: fromDid,
      message,
      callbackUrl: message?.callbackUrl,
    });

    return {
      status: "sent",
      to: toDid,
      from: fromDid,
      session,
      packedMessage: {
        id: session?.id,
        type: message?.type ?? "didcomm/message",
        body: message,
      },
    };
  }

  async receiveMessage(message: any) {
    return {
      status: "received",
      message,
      receivedAt: new Date().toISOString(),
    };
  }
}
