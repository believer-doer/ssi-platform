import { readFile } from "fs/promises";
import path from "path";

async function main() {
  const chainIdArg = process.argv[2];
  const chainId = chainIdArg ?? "31337";
  const filename = path.resolve(process.cwd(), "deployments", `universal-registry.${chainId}.json`);
  const deployment = JSON.parse(await readFile(filename, "utf8")) as {
    address: string;
    chainId: number;
    blockNumber?: number | null;
  };
  const rpcUrl = process.argv[3] ?? process.env.DEPLOY_RPC_URL ?? process.env.ETH_NODE_URL ?? "http://127.0.0.1:8545";

  console.log(`ENABLE_ETHEREUM=true`);
  console.log(`ETH_NODE_URL=${rpcUrl}`);
  console.log(`ETH_CHAIN_ID=${deployment.chainId}`);
  console.log(`ETH_PRIVATE_KEY=0xREPLACE_WITH_REAL_ETHEREUM_PRIVATE_KEY`);
  console.log(`ETH_REGISTRY_ADDRESS=${deployment.address}`);
  console.log(`ETH_REGISTRY_DEPLOY_BLOCK=${deployment.blockNumber ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
