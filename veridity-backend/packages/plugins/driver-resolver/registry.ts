import { env } from "@ssi/config";
import { InternalDriver } from "@ssi/driver-internal";
import { BitcoinDriver } from "@ssi/driver-bitcoin";
import { EthereumDriver } from "@ssi/driver-ethereum";
import { logger } from "@ssi/utils";

const registryLogger = logger.child("driver-registry");

// Drivers are constructed once so every module resolves the same in-memory instance.
const ethereumDriver = env.enableEthereum
  ? new EthereumDriver({
    rpcUrl: env.ethNodeUrl,
    privateKey: env.ethPrivateKey,
    chainId: env.ethChainId,
    registryAddress: env.ethRegistryAddress,
    registryDeployBlock: env.ethRegistryDeployBlock,
  })
  : new EthereumDriver();
const bitcoinDriver = env.enableBitcoin
  ? new BitcoinDriver({
    nodeUrl: env.btcNodeUrl,
    walletName: env.btcWalletName,
    network: env.btcNetwork,
  })
  : new BitcoinDriver();
const internalDriver = new InternalDriver();

export const driverRegistry = {
  internal: internalDriver,
  ethereum: ethereumDriver,
  bitcoin: bitcoinDriver,
} as const;

registryLogger.info("Driver registry initialized", {
  drivers: Object.keys(driverRegistry),
  ethereum: {
    enabled: env.enableEthereum,
    rpcUrl: env.enableEthereum ? env.ethNodeUrl : undefined,
    chainId: env.enableEthereum ? env.ethChainId : undefined,
    registryConfigured: ethereumDriver.hasRegistryClient,
    registryAddress: env.enableEthereum ? env.ethRegistryAddress : undefined,
    registryDeployBlock: env.enableEthereum ? env.ethRegistryDeployBlock : undefined,
  },
  bitcoin: {
    enabled: env.enableBitcoin,
    nodeUrl: env.enableBitcoin ? env.btcNodeUrl : undefined,
    walletName: env.enableBitcoin ? env.btcWalletName : undefined,
    network: env.enableBitcoin ? env.btcNetwork : undefined,
    anchorConfigured: bitcoinDriver.hasAnchorClient,
  },
});
