// packages/modules/wallet/index.ts
import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { validateDto } from "@ssi/utils";
import { WalletOnboardingDto } from "../dtos/platform.dto";

export default async function walletModule(fastify: FastifyInstance) {
  fastify.post("/:driver/wallets", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(WalletOnboardingDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      const key = driver?.kms?.createKey?.(payload.type || "Ed25519") as
        | { id?: string; publicKey?: string }
        | undefined;
      const did =
        payload.did ??
        (await driver.createDid({
          method: payload.didMethod ?? "key",
          publicKey: key?.publicKey ?? payload.name ?? "wallet",
        }));

      if (driver.wallet) {
        const wallet = await driver.wallet.onboard({
          id: `wallet:${Date.now()}`,
          name: payload.name ?? "Wallet",
          did,
          didMethod: payload.didMethod,
          tenantId: payload.tenantId,
          holderId: payload.holderId,
          walletType: payload.walletType ?? "internal",
          keyRef: key?.id,
          publicKey: key?.publicKey,
          supportedFormats: payload.supportedFormats,
          supportedProtocols: payload.supportedProtocols,
          metadata: payload.metadata,
        } as any);
        reply.send({ wallet, key });
        return;
      }

      reply.send({ did, key });
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/wallets", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = request.tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.wallet?.list) {
        return reply.status(501).send({ error: "Wallet onboarding is not supported by this driver" });
      }
      reply.send(await driver.wallet.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/wallets/:did", async (request, reply) => {
    const { driver: driverType, did } = request.params as {
      driver: keyof typeof resolveDriver;
      did: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.wallet) {
        return reply.status(501).send({ error: "Wallet onboarding is not supported by this driver" });
      }
      const wallet = await driver.wallet.getByDid(did);
      if (!wallet) return reply.status(404).send({ error: "Wallet not found" });
      reply.send(wallet);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
