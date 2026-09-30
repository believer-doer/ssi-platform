export type BitcoinNetwork = "mainnet" | "testnet" | "regtest" | string;

export interface BitcoinDriverOptions {
  nodeUrl?: string;
  walletName?: string;
  network?: BitcoinNetwork;
}

export interface BitcoinAnchorClientOptions {
  nodeUrl: string;
  walletName?: string;
  network?: BitcoinNetwork;
}

export interface BitcoinBlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  initialblockdownload: boolean;
}

export interface BitcoinWalletInfo {
  walletname?: string;
  balance?: number;
  txcount?: number;
}

export interface BitcoinCommitTransactionResult {
  txid: string;
  hex: string;
}

export interface BitcoinMerkleProofNode {
  position: "left" | "right";
  hash: string;
}

export interface BitcoinMerkleTree {
  rootHash: string;
  leafHashes: string[];
  proofs: BitcoinMerkleProofNode[][];
}

export type BitcoinAnchorStatus =
  | "unknown"
  | "mempool"
  | "confirmed"
  | "conflicted";

export interface BitcoinTransactionReceipt {
  txid: string;
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  blocktime?: number;
  hex?: string;
  status: BitcoinAnchorStatus;
}
