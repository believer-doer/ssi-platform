import axios from "axios";
import type {
  BitcoinCommitTransactionResult,
  BitcoinAnchorClientOptions,
  BitcoinBlockchainInfo,
  BitcoinTransactionReceipt,
  BitcoinWalletInfo,
} from "./config";

type RpcSuccess<T> = {
  result: T;
  error: null;
  id: string;
};

type RpcFailure = {
  result: null;
  error: {
    code: number;
    message: string;
  };
  id: string;
};

type RpcResponse<T> = RpcSuccess<T> | RpcFailure;

type RawTransactionResult = {
  txid: string;
  confirmations?: number;
  blockhash?: string;
  blocktime?: number;
  hex?: string;
};

type WalletTransactionResult = RawTransactionResult & {
  walletconflicts?: string[];
  blockheight?: number;
};

type WalletCreateFundedPsbtResult = {
  psbt: string;
  fee?: number;
  changepos?: number;
};

type WalletProcessPsbtResult = {
  psbt: string;
  complete: boolean;
};

type FinalizePsbtResult = {
  hex?: string;
  complete: boolean;
};

function parseNodeUrl(nodeUrl: string) {
  const url = new URL(nodeUrl);
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  url.username = "";
  url.password = "";

  return {
    rpcUrl: url.toString(),
    auth: username || password
      ? { username, password }
      : undefined,
  };
}

export class BitcoinAnchorClient {
  readonly nodeUrl: string;
  readonly walletName?: string;
  readonly network?: string;
  private readonly http: ReturnType<typeof axios.create>;

  constructor(options: BitcoinAnchorClientOptions) {
    this.nodeUrl = options.nodeUrl;
    this.walletName = options.walletName;
    this.network = options.network;

    const parsed = parseNodeUrl(options.nodeUrl);
    this.http = axios.create({
      baseURL: parsed.rpcUrl.replace(/\/$/, ""),
      auth: parsed.auth,
      headers: {
        "content-type": "application/json",
      },
      timeout: 10_000,
    });
  }

  async getBlockchainInfo() {
    return this.rpc<BitcoinBlockchainInfo>("getblockchaininfo");
  }

  async getWalletInfo() {
    return this.walletRpc<BitcoinWalletInfo>("getwalletinfo");
  }

  async getBlockCount() {
    return this.rpc<number>("getblockcount");
  }

  async getTransactionReceipt(txid: string): Promise<BitcoinTransactionReceipt> {
    const walletResult = await this.tryWalletTransaction(txid);
    if (walletResult) {
      return this.toReceipt(walletResult);
    }

    const rawResult = await this.rpc<RawTransactionResult>("getrawtransaction", [txid, true]);
    return this.toReceipt(rawResult);
  }

  async getConfirmations(txid: string) {
    const receipt = await this.getTransactionReceipt(txid);
    return {
      txid: receipt.txid,
      confirmations: receipt.confirmations,
      status: receipt.status,
      blockheight: receipt.blockheight,
      blockhash: receipt.blockhash,
    };
  }

  async broadcastRawTransaction(rawTxHex: string) {
    return this.rpc<string>("sendrawtransaction", [rawTxHex]);
  }

  async commitRoot(rootHash: string): Promise<BitcoinCommitTransactionResult> {
    const dataHex = rootHash.startsWith("0x") ? rootHash.slice(2) : rootHash;
    if (!/^[0-9a-fA-F]{64}$/.test(dataHex)) {
      throw new Error(`Bitcoin commitment root must be a 32-byte hex string. Received '${rootHash}'.`);
    }

    const funded = await this.walletRpc<WalletCreateFundedPsbtResult>(
      "walletcreatefundedpsbt",
      [
        [],
        [{ data: dataHex }],
        0,
        {
          replaceable: false,
          includeWatching: true,
        },
      ],
    );
    const processed = await this.walletRpc<WalletProcessPsbtResult>(
      "walletprocesspsbt",
      [funded.psbt],
    );
    const finalized = await this.rpc<FinalizePsbtResult>(
      "finalizepsbt",
      [processed.psbt],
    );

    if (!finalized.complete || !finalized.hex) {
      throw new Error("Bitcoin RPC finalizepsbt did not produce a complete transaction");
    }

    const txid = await this.broadcastRawTransaction(finalized.hex);
    return {
      txid,
      hex: finalized.hex,
    };
  }

  private async tryWalletTransaction(txid: string) {
    if (!this.walletName) {
      return null;
    }

    try {
      return await this.walletRpc<WalletTransactionResult>("gettransaction", [txid, true]);
    } catch {
      return null;
    }
  }

  private toReceipt(transaction: RawTransactionResult | WalletTransactionResult): BitcoinTransactionReceipt {
    const confirmations = Number(transaction.confirmations ?? 0);
    const hasConflict = Array.isArray((transaction as WalletTransactionResult).walletconflicts)
      && (transaction as WalletTransactionResult).walletconflicts!.length > 0;

    return {
      txid: transaction.txid,
      confirmations,
      blockhash: transaction.blockhash,
      blockheight: (transaction as WalletTransactionResult).blockheight,
      blocktime: transaction.blocktime,
      hex: transaction.hex,
      status: hasConflict
        ? "conflicted"
        : confirmations > 0
          ? "confirmed"
          : "mempool",
    };
  }

  private async walletRpc<T>(method: string, params: unknown[] = []) {
    if (!this.walletName) {
      throw new Error(`Bitcoin wallet RPC '${method}' requires BTC_WALLET_NAME`);
    }

    return this.call<T>(`/wallet/${encodeURIComponent(this.walletName)}`, method, params);
  }

  private async rpc<T>(method: string, params: unknown[] = []) {
    return this.call<T>("", method, params);
  }

  private async call<T>(path: string, method: string, params: unknown[]) {
    const response = await this.http.post<RpcResponse<T>>(path || "/", {
      jsonrpc: "1.0",
      id: `${method}:${Date.now()}`,
      method,
      params,
    });

    if (response.data.error) {
      throw new Error(`Bitcoin RPC ${method} failed: ${response.data.error.message}`);
    }

    return response.data.result;
  }
}
