import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredCredentialRecord {
  id: string;
  title: string;
  issuer: string;
  format: string;
  status: "valid" | "pending" | "deferred" | "received" | "failed";
  receivedAt: string;
  sessionId?: string;
  transactionId?: string;
  credential: unknown;
  claims?: Record<string, unknown>;
}

export interface StoredPresentationRecord {
  id: string;
  sessionId: string;
  state?: string;
  verifierDid?: string;
  submittedAt: string;
  requestUri?: string;
  result: unknown;
}

const CREDENTIALS_KEY = "veridity-wallet.credentials.v1";
const PRESENTATIONS_KEY = "veridity-wallet.presentations.v1";
type WalletStoreListener = () => void;

const listeners = new Set<WalletStoreListener>();

export function subscribeWalletStore(listener: WalletStoreListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyWalletStoreChanged() {
  for (const listener of listeners) {
    listener();
  }
}

async function readJson<T>(key: string, fallback: T) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadStoredCredentials() {
  return readJson<StoredCredentialRecord[]>(CREDENTIALS_KEY, []);
}

export async function saveStoredCredential(record: StoredCredentialRecord) {
  const current = await loadStoredCredentials();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 25);
  await writeJson(CREDENTIALS_KEY, next);
  notifyWalletStoreChanged();
  return next;
}

export async function loadPresentationHistory() {
  return readJson<StoredPresentationRecord[]>(PRESENTATIONS_KEY, []);
}

export async function savePresentationHistory(record: StoredPresentationRecord) {
  const current = await loadPresentationHistory();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 25);
  await writeJson(PRESENTATIONS_KEY, next);
  notifyWalletStoreChanged();
  return next;
}
