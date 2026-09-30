import { mkdir, writeFile } from "fs/promises";
import path from "path";
import hre from "hardhat";

const deploymentsDir = path.resolve(process.cwd(), "deployments");

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();
  const networkConfig = network.config as { url?: string };
  const rpcUrl = networkConfig.url ?? process.env.DEPLOY_RPC_URL ?? process.env.ETH_NODE_URL ?? "http://127.0.0.1:8545";

  console.log(`Deploying UniversalRegistry with ${deployer.address} to network ${network.name} on chain ${chain.chainId}`);

  const factory = await ethers.getContractFactory("UniversalRegistry", deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  const deployment = {
    contractName: "UniversalRegistry",
    address,
    deployer: deployer.address,
    chainId: Number(chain.chainId),
    txHash: deploymentTx?.hash ?? null,
    blockNumber: receipt?.blockNumber ?? null,
    deployedAt: new Date().toISOString(),
  };

  await mkdir(deploymentsDir, { recursive: true });
  const filename = path.join(deploymentsDir, `universal-registry.${Number(chain.chainId)}.json`);
  await writeFile(filename, JSON.stringify(deployment, null, 2));

  console.log("\nDeployment saved to:");
  console.log(filename);

  console.log("\nUse these .env values:");
  console.log(`ENABLE_ETHEREUM=true`);
  console.log(`ETH_NODE_URL=${rpcUrl}`);
  console.log(`ETH_CHAIN_ID=${Number(chain.chainId)}`);
  console.log(`ETH_PRIVATE_KEY=<replace-with-private-key-for-${deployer.address}>`);
  console.log(`ETH_REGISTRY_ADDRESS=${address}`);
  console.log(`ETH_REGISTRY_DEPLOY_BLOCK=${receipt?.blockNumber ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
