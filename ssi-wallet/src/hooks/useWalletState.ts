import { useEffect, useMemo, useState } from "react";
import type { WalletCredential, WalletActivity, WalletStats } from "@/types";
import {
  loadPresentationHistory,
  loadStoredCredentials,
  subscribeWalletStore,
  type StoredCredentialRecord,
  type StoredPresentationRecord,
} from "@/lib/walletStore";

type LoadingState = "loading" | "ready" | "error";

export interface WalletDashboardState {
  status: LoadingState;
  error: string | null;
  credentials: StoredCredentialRecord[];
  presentations: StoredPresentationRecord[];
  walletStats: WalletStats;
  allCredentials: WalletCredential[];
  recentCredentials: WalletCredential[];
  recentActivities: WalletActivity[];
  findCredential: (id: string) => WalletCredential | null;
  reload: () => Promise<void>;
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function credentialFormatLabel(format: string): WalletCredential["format"] {
  return format.toLowerCase().includes("sd-jwt") ? "SD-JWT VC" : "JWT VC";
}

function isTrustedCredential(record: StoredCredentialRecord) {
  return record.status !== "failed";
}

function toWalletCredential(record: StoredCredentialRecord): WalletCredential {
  const claims = Object.entries(record.claims ?? {}).map(([label, value]) => ({
    label,
    value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    selective: true,
  }));

  return {
    id: record.id,
    title: record.title,
    issuer: record.issuer,
    category: record.status === "deferred" ? "Pending" : "Received",
    format: credentialFormatLabel(record.format),
    status: record.status === "failed" ? "expired" : "valid",
    issuedAt: formatDateLabel(record.receivedAt),
    expiresAt: record.transactionId ? "Deferred" : "Session bound",
    trusted: isTrustedCredential(record),
    claims: claims.length > 0 ? claims : [{ label: "Credential payload", value: "Available in wallet storage", selective: true }],
  };
}

function buildRecentActivities(
  credentials: StoredCredentialRecord[],
  presentations: StoredPresentationRecord[],
): WalletActivity[] {
  const events = [
    ...credentials.slice(0, 3).map((record) => ({
      sortAt: new Date(record.receivedAt).getTime(),
      activity: {
        id: `cred-${record.id}`,
        title: record.status === "deferred" ? "Credential pending" : "Credential received",
        detail: `${record.title} from ${record.issuer}.`,
        timestamp: `${formatDateLabel(record.receivedAt)} · ${formatTimeLabel(record.receivedAt)}`,
        kind: "issue" as const,
      },
    })),
    ...presentations.slice(0, 3).map((record) => ({
      sortAt: new Date(record.submittedAt).getTime(),
      activity: {
        id: `pres-${record.id}`,
        title: "Presentation submitted",
        detail: `${record.verifierDid || "Verifier"} session ${record.sessionId}.`,
        timestamp: `${formatDateLabel(record.submittedAt)} · ${formatTimeLabel(record.submittedAt)}`,
        kind: "present" as const,
      },
    })),
  ];

  return events
    .sort((left, right) => right.sortAt - left.sortAt)
    .slice(0, 4)
    .map((entry) => entry.activity);
}

function buildWalletStats(credentials: StoredCredentialRecord[], presentations: StoredPresentationRecord[]): WalletStats {
  const trustedIssuers = new Set(credentials.filter(isTrustedCredential).map((record) => record.issuer)).size;
  return {
    credentialCount: credentials.length,
    trustedIssuers,
    presentations: presentations.length,
    secureState: "Biometric lock enabled",
  };
}

export function useWalletState(): WalletDashboardState {
  const [credentials, setCredentials] = useState<StoredCredentialRecord[]>([]);
  const [presentations, setPresentations] = useState<StoredPresentationRecord[]>([]);
  const [status, setStatus] = useState<LoadingState>("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useMemo(() => async () => {
    try {
      const [credentialRecords, presentationRecords] = await Promise.all([
        loadStoredCredentials(),
        loadPresentationHistory(),
      ]);
      setCredentials(credentialRecords);
      setPresentations(presentationRecords);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => subscribeWalletStore(() => { void reload(); }), [reload]);

  const allCredentials = useMemo(
    () => [...credentials].sort((left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()).map(toWalletCredential),
    [credentials],
  );
  const recentCredentials = useMemo(() => allCredentials.slice(0, 3), [allCredentials]);
  const recentActivities = useMemo(() => buildRecentActivities(credentials, presentations), [credentials, presentations]);
  const walletStats = useMemo(() => buildWalletStats(credentials, presentations), [credentials, presentations]);

  const findCredential = useMemo(() => {
    const lookup = new Map(allCredentials.map((record) => [record.id, record]));
    return (id: string) => lookup.get(id) ?? null;
  }, [allCredentials]);

  return {
    status,
    error,
    credentials,
    presentations,
    walletStats,
    allCredentials,
    recentCredentials,
    recentActivities,
    findCredential,
    reload,
  };
}
