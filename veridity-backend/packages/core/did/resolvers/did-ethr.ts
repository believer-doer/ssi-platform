import { ethers } from "ethers";

export interface ResolveEthrDidOptions {
  rpcUrl?: string;
  chainId?: number;
  registryAddress?: string;
  registryDeployBlock?: number;
}

const REGISTRY_READ_ABI = [
  "function admin() view returns (address)",
  "function getIssuer(string did) view returns (uint8 status, string metadataURI, uint256 updatedAt)",
  "function getVerifier(string did) view returns (uint8 status, string metadataURI, uint256 updatedAt)",
  "event IssuerUpserted(string did, string metadataURI, uint8 status)",
  "event IssuerStatusUpdated(string did, uint8 status)",
  "event IssuerRegistered(string did, string metadataURI)",
  "event IssuerRevoked(string did)",
  "event VerifierUpserted(string did, string metadataURI, uint8 status)",
  "event VerifierStatusUpdated(string did, uint8 status)",
  "event VerifierRegistered(string did, string metadataURI)",
  "event VerifierRevoked(string did)",
] as const;

function statusName(status: number) {
  switch (status) {
    case 1:
      return "pending";
    case 2:
      return "active";
    case 3:
      return "suspended";
    case 4:
      return "revoked";
    default:
      return "unknown";
  }
}

function parseEthereumDid(did: string) {
  if (did.startsWith("did:pkh:eip155:")) {
    const parts = did.split(":");
    const chainReference = `${parts[2]}:${parts[3]}`;
    const address = parts[4];
    return { address, chainReference };
  }

  if (did.startsWith("did:ethr:")) {
    const parts = did.split(":");
    if (parts.length === 3) {
      return { address: parts[2], chainReference: undefined };
    }
    return {
      address: parts[parts.length - 1],
      chainReference: parts.slice(2, -1).join(":"),
    };
  }

  return {
    address: did.split(":").pop(),
    chainReference: undefined,
  };
}

function eventStatus(eventName: string, args: ethers.Result) {
  switch (eventName) {
    case "IssuerRegistered":
    case "VerifierRegistered":
      return "active";
    case "IssuerRevoked":
    case "VerifierRevoked":
      return "revoked";
    case "IssuerUpserted":
    case "IssuerStatusUpdated":
    case "VerifierUpserted":
    case "VerifierStatusUpdated":
      return statusName(Number(args[args.length - 1]));
    default:
      return "unknown";
  }
}

async function blockTimestamp(
  provider: ethers.JsonRpcProvider,
  cache: Map<number, string>,
  blockNumber: number,
) {
  const cached = cache.get(blockNumber);
  if (cached) {
    return cached;
  }

  const block = await provider.getBlock(blockNumber);
  const value = new Date(Number(block?.timestamp ?? 0) * 1000).toISOString();
  cache.set(blockNumber, value);
  return value;
}

async function loadRegistryHistory(
  registry: ethers.Contract,
  provider: ethers.JsonRpcProvider,
  did: string,
  fromBlock: number,
  toBlock: number,
) {
  const timestampCache = new Map<number, string>();
  const eventNames = [
    "IssuerUpserted",
    "IssuerStatusUpdated",
    "IssuerRegistered",
    "IssuerRevoked",
    "VerifierUpserted",
    "VerifierStatusUpdated",
    "VerifierRegistered",
    "VerifierRevoked",
  ] as const;

  const groups = await Promise.all(
    eventNames.map(async (eventName) => {
      const logs = await registry.queryFilter(eventName, fromBlock, toBlock);
      return logs
        .filter((log): log is ethers.EventLog => "args" in log)
        .filter((log) => String(log.args[0]) === did)
        .map(async (log) => ({
          role: eventName.startsWith("Issuer") ? "issuer" : "verifier",
          event: eventName,
          status: eventStatus(eventName, log.args),
          metadataURI: typeof log.args[1] === "string" ? log.args[1] : undefined,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: await blockTimestamp(provider, timestampCache, log.blockNumber),
        }));
    }),
  );

  return (await Promise.all(groups.flat())).sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber - right.blockNumber;
    }
    return left.event.localeCompare(right.event);
  });
}

export async function resolveEthrDID(did: string, options: ResolveEthrDidOptions = {}) {
  const parsed = parseEthereumDid(did);
  const provider = new ethers.JsonRpcProvider(options.rpcUrl ?? "http://localhost:8545");
  const network = await provider.getNetwork();
  const normalizedAddress = parsed.address
    ? (() => {
      try {
        return ethers.getAddress(parsed.address);
      } catch {
        return parsed.address;
      }
    })()
    : undefined;
  const resolvedChainId = options.chainId ?? Number(network.chainId);
  const [balance, code] = await Promise.all([
    normalizedAddress ? provider.getBalance(normalizedAddress) : Promise.resolve(0n),
    normalizedAddress ? provider.getCode(normalizedAddress) : Promise.resolve("0x"),
  ]);

  let registryAdmin: string | undefined;
  let issuerRegistryRecord: Record<string, unknown> | undefined;
  let verifierRegistryRecord: Record<string, unknown> | undefined;
  let registryHistory: Array<Record<string, unknown>> = [];

  if (options.registryAddress) {
    try {
      const registry = new ethers.Contract(options.registryAddress, REGISTRY_READ_ABI, provider);
      const latestBlock = await provider.getBlockNumber();
      const [admin, issuer, verifier, history] = await Promise.all([
        registry.admin() as Promise<string>,
        registry.getIssuer(did) as Promise<[number, string, bigint]>,
        registry.getVerifier(did) as Promise<[number, string, bigint]>,
        loadRegistryHistory(
          registry,
          provider,
          did,
          options.registryDeployBlock ?? 0,
          latestBlock,
        ),
      ]);

      registryAdmin = admin;
      registryHistory = history;

      if (Number(issuer[0]) > 0) {
        issuerRegistryRecord = {
          status: statusName(Number(issuer[0])),
          metadataURI: issuer[1],
          updatedAt: new Date(Number(issuer[2]) * 1000).toISOString(),
        };
      }
      if (Number(verifier[0]) > 0) {
        verifierRegistryRecord = {
          status: statusName(Number(verifier[0])),
          metadataURI: verifier[1],
          updatedAt: new Date(Number(verifier[2]) * 1000).toISOString(),
        };
      }
    } catch {
      // Best-effort enrichment only.
    }
  }

  const services = [];
  if (issuerRegistryRecord) {
    services.push({
      id: `${did}#issuer-registry`,
      type: "EthereumIssuerRegistryRecord",
      serviceEndpoint: options.registryAddress,
      registryRecord: issuerRegistryRecord,
    });
  }
  if (verifierRegistryRecord) {
    services.push({
      id: `${did}#verifier-registry`,
      type: "EthereumVerifierRegistryRecord",
      serviceEndpoint: options.registryAddress,
      registryRecord: verifierRegistryRecord,
    });
  }
  if (registryHistory.length > 0) {
    services.push({
      id: `${did}#registry-history`,
      type: "EthereumRegistryHistory",
      serviceEndpoint: options.registryAddress,
      events: registryHistory,
    });
  }
  if (registryAdmin) {
    services.push({
      id: `${did}#registry-admin`,
      type: "EthereumRegistryAdmin",
      serviceEndpoint: options.registryAddress,
      admin: registryAdmin,
    });
  }

  const blockchainAccountId = normalizedAddress
    ? `eip155:${resolvedChainId}:${normalizedAddress}`
    : undefined;

  return {
    id: did,
    alsoKnownAs: normalizedAddress
      ? [`did:pkh:eip155:${resolvedChainId}:${normalizedAddress}`]
      : [],
    verificationMethod: [
      {
        id: `${did}#controller`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: did,
        blockchainAccountId,
      },
    ],
    authentication: [`${did}#controller`],
    assertionMethod: [`${did}#controller`],
    capabilityInvocation: [`${did}#controller`],
    service: services,
    metadata: {
      network: {
        chainId: resolvedChainId,
        rpcUrl: options.rpcUrl ?? "http://localhost:8545",
        chainReference: parsed.chainReference,
      },
      account: {
        address: normalizedAddress,
        balance: balance.toString(),
        codeDeployed: code !== "0x",
      },
      registryAddress: options.registryAddress,
      registryDeployBlock: options.registryDeployBlock,
    },
  };
}
