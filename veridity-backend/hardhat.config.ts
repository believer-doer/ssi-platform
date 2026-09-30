import "@nomicfoundation/hardhat-ethers";
import { subtask } from "hardhat/config";
import type { HardhatUserConfig } from "hardhat/config";
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from "hardhat/builtin-tasks/task-names";

const localSolcVersion = "0.8.26";
const externalRpcUrl = process.env.DEPLOY_RPC_URL ?? process.env.ETH_NODE_URL;
const externalPrivateKey = process.env.DEPLOY_PRIVATE_KEY ?? process.env.ETH_PRIVATE_KEY;
const externalChainId = process.env.DEPLOY_CHAIN_ID
  ? Number(process.env.DEPLOY_CHAIN_ID)
  : process.env.ETH_CHAIN_ID
    ? Number(process.env.ETH_CHAIN_ID)
    : undefined;

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async () => {
  return {
    version: localSolcVersion,
    longVersion: localSolcVersion,
    compilerPath: require.resolve("solc/soljson.js"),
    isSolcJs: true,
  };
});

subtask(TASK_COMPILE_SOLIDITY_RUN_SOLCJS).setAction(async ({ input }) => {
  const solc = require("solc") as {
    compile(source: string): string;
  };

  return JSON.parse(solc.compile(JSON.stringify(input)));
});

const config: HardhatUserConfig = {
  solidity: {
    version: localSolcVersion,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./packages/drivers/ethereum/src/contracts",
    artifacts: "./artifacts",
    cache: "./cache/hardhat",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ...(externalRpcUrl && externalPrivateKey
      ? {
        external: {
          url: externalRpcUrl,
          accounts: [externalPrivateKey],
          ...(externalChainId ? { chainId: externalChainId } : {}),
        },
      }
      : {}),
  },
};

export default config;
