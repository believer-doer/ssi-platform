import { useEffect, useMemo, useState } from "react";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { walletEnv } from "@/config/env";
import {
  createIssuanceProofJwt,
  createPkcePair,
  defaultWalletClientId,
  defaultWalletHolderDid,
  parseMaybeJson,
  protocolFetchJson,
  toJsonRecord,
} from "@/lib/protocol";
import { saveStoredCredential } from "@/lib/walletStore";
import { colors } from "@/theme/colors";

type StepStatus = "idle" | "running" | "ready" | "error";

type AuthorizeRequestPayload = Record<string, unknown> & {
  tenantId?: string;
  issuerDid?: string;
  schemaId?: string;
  holderDid?: string;
  walletId?: string;
  client_id: string;
  redirect_uri?: string;
  format?: string;
  claims?: Record<string, unknown>;
  defer?: boolean;
  grant_type: string;
  code_challenge: string;
  code_challenge_method: "plain" | "S256";
};

const defaultClaims = {
  given_name: "Aarav",
  family_name: "Mehta",
  employee_id: "E-001",
};

function createDefaultAuthorizeBody() {
  return JSON.stringify(
    {
      tenantId: "tenant:demo",
      issuerDid: "did:example:issuer-001",
      schemaId: "schema.employee.idcard.v1",
      holderDid: defaultWalletHolderDid(),
      walletId: "wallet:veridity-mobile",
      client_id: defaultWalletClientId(),
      redirect_uri: `${walletEnv.backendOrigin}/callback`,
      format: "vc-jwt",
      claims: defaultClaims,
      defer: false,
    },
    null,
    2,
  );
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function mergeInviteIntoAuthorizeBody(rawInvite: string) {
  const parsed = parseMaybeJson(rawInvite);
  const record = toJsonRecord(parsed);
  const base = {
    tenantId: "tenant:demo",
    issuerDid: "did:example:issuer-001",
    schemaId: "schema.employee.idcard.v1",
    holderDid: defaultWalletHolderDid(),
    walletId: "wallet:veridity-mobile",
    client_id: defaultWalletClientId(),
    redirect_uri: `${walletEnv.backendOrigin}/callback`,
    format: "vc-jwt",
    claims: defaultClaims,
    defer: false,
  };

  if (!record) {
    return base;
  }

  return {
    ...base,
    tenantId: typeof record.tenantId === "string" && record.tenantId.trim() ? record.tenantId : base.tenantId,
    issuerDid: typeof record.issuerDid === "string" && record.issuerDid.trim() ? record.issuerDid : base.issuerDid,
    schemaId: typeof record.schemaId === "string" && record.schemaId.trim() ? record.schemaId : base.schemaId,
    holderDid: typeof record.holderDid === "string" && record.holderDid.trim() ? record.holderDid : base.holderDid,
    walletId: typeof record.walletId === "string" && record.walletId.trim() ? record.walletId : base.walletId,
    client_id: typeof record.client_id === "string" && record.client_id.trim() ? record.client_id : base.client_id,
    redirect_uri: typeof record.redirect_uri === "string" && record.redirect_uri.trim() ? record.redirect_uri : base.redirect_uri,
    format: typeof record.format === "string" && record.format.trim() ? record.format : base.format,
    claims: toJsonRecord(record.claims) ?? base.claims,
    defer: typeof record.defer === "boolean" ? record.defer : base.defer,
    grant_type: typeof record.grant_type === "string" && record.grant_type.trim() ? record.grant_type : "authorization_code",
    code_challenge_method:
      typeof record.code_challenge_method === "string" && record.code_challenge_method.trim()
        ? record.code_challenge_method
        : "plain",
  };
}

function makeSummaryLabel(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

export default function ReceiveScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [invite, setInvite] = useState("");
  const [authorizeBody, setAuthorizeBody] = useState(createDefaultAuthorizeBody);
  const [authorizeResult, setAuthorizeResult] = useState<Record<string, unknown> | null>(null);
  const [tokenResult, setTokenResult] = useState<Record<string, unknown> | null>(null);
  const [credentialResult, setCredentialResult] = useState<Record<string, unknown> | null>(null);
  const [deferredResult, setDeferredResult] = useState<Record<string, unknown> | null>(null);
  const [sessionResult, setSessionResult] = useState<Record<string, unknown> | null>(null);
  const [deferredTransactionId, setDeferredTransactionId] = useState("");
  const [stepStatus, setStepStatus] = useState<{ authorize: StepStatus; token: StepStatus; credential: StepStatus }>({
    authorize: "idle",
    token: "idle",
    credential: "idle",
  });
  const [error, setError] = useState<string | null>(null);
  const [pollSession, setPollSession] = useState(false);
  const [savedCredentialMessage, setSavedCredentialMessage] = useState<string | null>(null);

  const invitePreview = useMemo(() => parseMaybeJson(invite), [invite]);
  const authorizeDraft = useMemo(() => {
    try {
      const parsed = JSON.parse(authorizeBody) as Record<string, unknown>;
      return parsed;
    } catch {
      return null;
    }
  }, [authorizeBody]);

  const sessionId = String(authorizeResult?.session_id ?? sessionResult?.id ?? "").trim();
  const accessToken = String(tokenResult?.access_token ?? "").trim();
  const cNonce = String(authorizeResult?.c_nonce ?? tokenResult?.c_nonce ?? "").trim();
  const issuerLabel = makeSummaryLabel(authorizeResult?.issuer, `${walletEnv.backendApiBaseUrl}/${walletEnv.backendDriver}/protocols/oidc4vci`);
  const credentialLabel = credentialResult?.format ? String(credentialResult.format) : "pending";

  useEffect(() => {
    if (!pollSession || !sessionId) {
      return;
    }

    let active = true;
    const refresh = async () => {
      try {
        const data = await protocolFetchJson(`/v1/${walletEnv.backendDriver}/protocols/sessions/${encodeURIComponent(sessionId)}`);
        if (active) {
          setSessionResult(data as Record<string, unknown>);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pollSession, sessionId]);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!result.data) {
      return;
    }

    setInvite(result.data);
    setError(null);
  }

  function handleRequestPermission() {
    void requestPermission?.();
  }

  function handleLoadInvite() {
    const nextBody = mergeInviteIntoAuthorizeBody(invite);
    setAuthorizeBody(JSON.stringify(nextBody, null, 2));
    setSavedCredentialMessage("Invitation merged into the authorize request draft.");
  }

  async function fetchSession(sessionIdentifier: string) {
    if (!sessionIdentifier) {
      return null;
    }

    const data = await protocolFetchJson(`/v1/${walletEnv.backendDriver}/protocols/sessions/${encodeURIComponent(sessionIdentifier)}`);
    setSessionResult(data as Record<string, unknown>);
    return data as Record<string, unknown>;
  }

  async function fetchDeferred(transactionId: string) {
    if (!transactionId) {
      throw new Error("A deferred transaction id is required");
    }
    if (!accessToken) {
      throw new Error("Run the token step before fetching a deferred credential");
    }

    const data = await protocolFetchJson(
      `/v1/${walletEnv.backendDriver}/protocols/oidc4vci/deferred?transaction_id=${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    setDeferredResult(data as Record<string, unknown>);
    return data as Record<string, unknown>;
  }

  async function runIssuanceFlow() {
    setError(null);
    setSavedCredentialMessage(null);

    if (!authorizeDraft) {
      throw new Error("The authorize request draft is not valid JSON");
    }

    setStepStatus({ authorize: "running", token: "idle", credential: "idle" });

    const requestedGrantType = String(authorizeDraft.grant_type || "authorization_code");
    const pkce = createPkcePair();
    const authorizePayload: AuthorizeRequestPayload = {
      ...authorizeDraft,
      client_id: String(authorizeDraft.client_id || defaultWalletClientId()),
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      grant_type: requestedGrantType,
    };

    const authorizeResponse = await protocolFetchJson(
      `/v1/${walletEnv.backendDriver}/protocols/oidc4vci/authorize`,
      {
        method: "POST",
        body: JSON.stringify(authorizePayload),
      },
    );
    const authorizeRecord = authorizeResponse as Record<string, unknown>;
    setAuthorizeResult(authorizeRecord);
    setStepStatus((current) => ({ ...current, authorize: "ready", token: "running" }));

    await fetchSession(String(authorizeRecord.session_id ?? ""));

    const usePreAuthorizedGrant = requestedGrantType.includes("pre-authorized");
    const grantType = usePreAuthorizedGrant
      ? "urn:ietf:params:oauth:grant-type:pre-authorized_code"
      : "authorization_code";
    const authorizationCode = String(
      authorizeRecord.authorization_code ?? authorizeRecord.pre_authorized_code ?? "",
    ).trim();

    const tokenRequest =
      grantType === "authorization_code"
        ? {
            grant_type: grantType,
            code: authorizationCode,
            code_verifier: pkce.codeVerifier,
            client_id: String(authorizePayload.client_id),
          }
        : {
            grant_type: grantType,
            pre_authorized_code: authorizationCode,
            client_id: String(authorizePayload.client_id),
          };

    const tokenResponse = await protocolFetchJson(
      `/v1/${walletEnv.backendDriver}/protocols/oidc4vci/token`,
      {
        method: "POST",
        body: JSON.stringify(tokenRequest),
      },
    );
    const tokenRecord = tokenResponse as Record<string, unknown>;
    setTokenResult(tokenRecord);
    setStepStatus((current) => ({ ...current, token: "ready", credential: "running" }));

    const proofJwt = createIssuanceProofJwt({
      nonce: String(authorizeRecord.c_nonce ?? tokenRecord.c_nonce ?? ""),
      issuerDid: String(authorizePayload.issuerDid || ""),
      subjectDid: String(authorizePayload.holderDid || defaultWalletHolderDid()),
      audience: String(authorizeRecord.issuer || issuerLabel),
    });

    const credentialResponse = await protocolFetchJson(
      `/v1/${walletEnv.backendDriver}/protocols/oidc4vci/credential`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${String(tokenRecord.access_token || "")}`,
        },
        body: JSON.stringify({
          format: String(authorizePayload.format || "vc-jwt"),
          claims: toJsonRecord(authorizePayload.claims) ?? {},
          defer: Boolean(authorizePayload.defer),
          proof: {
            proof_type: "jwt",
            jwt: proofJwt,
          },
        }),
      },
    );
    const credentialRecord = credentialResponse as Record<string, unknown>;
    setCredentialResult(credentialRecord);
    setStepStatus((current) => ({ ...current, credential: "ready" }));

    const transactionId = String(credentialRecord.transaction_id ?? "").trim();
    if (transactionId) {
      setDeferredTransactionId(transactionId);
      setDeferredResult(credentialRecord);
    }

    const storedCredential = await saveStoredCredential({
      id: String(authorizeRecord.session_id ?? credentialRecord.transaction_id ?? Date.now()),
      title: `${String(authorizePayload.format || "vc-jwt").toUpperCase()} credential`,
      issuer: String(authorizePayload.issuerDid || "Unknown issuer"),
      format: String(authorizePayload.format || "vc-jwt"),
      status: transactionId ? "deferred" : "received",
      receivedAt: new Date().toISOString(),
      sessionId: String(authorizeRecord.session_id ?? ""),
      transactionId: transactionId || undefined,
      credential: credentialRecord.credential ?? credentialRecord,
      claims: toJsonRecord(authorizePayload.claims) ?? undefined,
    });

    setSavedCredentialMessage(`Stored ${storedCredential[0]?.title || "credential"} in local wallet storage.`);
    void fetchSession(String(authorizeRecord.session_id ?? "")).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });

    if (transactionId) {
      try {
        const deferred = await fetchDeferred(transactionId);
        if (deferred) {
          setDeferredResult(deferred);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="Receive" subtitle="Accept credentials by QR, deep link, or invitation payload" />

        <SectionHeader
          kicker="Incoming flow"
          title="Scan or paste an issuance invitation."
          body="The wallet now uses the live OIDC4VCI authorize, token, and credential endpoints, then stores the resulting credential locally."
        />

        <View style={styles.backendNote}>
          <Text style={styles.backendLabel}>Configured issuer metadata</Text>
          <Text style={styles.backendValue}>{walletEnv.issuerMetadataUrl}</Text>
        </View>

        <View style={styles.scannerCard}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.cameraTitle}>Camera access required</Text>
              <Text style={styles.cameraBody}>
                Grant camera permission to scan OIDC4VCI invitations from issuers and onboarding portals.
              </Text>
              <PrimaryButton title="Enable camera" onPress={handleRequestPermission} />
            </View>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Paste invitation payload</Text>
          <TextInput
            value={invite}
            onChangeText={setInvite}
            placeholder='Paste a wallet invite JSON or deep link here'
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <View style={styles.inlineActions}>
            <PrimaryButton title="Load invitation" onPress={handleLoadInvite} />
            <PrimaryButton
              title="Use sample invite"
              onPress={() => {
                setInvite(JSON.stringify({ issuerDid: "did:example:issuer-001", schemaId: "schema.employee.idcard.v1" }, null, 2));
              }}
              variant="secondary"
            />
          </View>
          <Text style={styles.helperText}>
            The invite can be raw JSON or a deep link. When it contains issuance fields, the wallet merges them into the authorize request draft.
          </Text>
          {(invitePreview && typeof invitePreview === "object") || typeof invitePreview === "string" ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Invitation preview</Text>
              <Text style={styles.previewValue}>{formatJson(invitePreview)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>OIDC4VCI authorize request</Text>
          <Text style={styles.helperText}>
            This payload is sent to `/authorize`, then the returned code is exchanged at `/token`, and the access token is used for `/credential`.
          </Text>
          <TextInput
            value={authorizeBody}
            onChangeText={setAuthorizeBody}
            style={styles.requestInput}
            multiline
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.inlineActions}>
            <PrimaryButton
              title={stepStatus.authorize === "running" ? "Issuing..." : "Run issuance flow"}
              onPress={() => {
                void runIssuanceFlow().catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                  setStepStatus({ authorize: "error", token: "error", credential: "error" });
                });
              }}
            />
            <PrimaryButton
              title="Reset request"
              onPress={() => setAuthorizeBody(createDefaultAuthorizeBody())}
              variant="secondary"
            />
          </View>
          <View style={styles.statusRow}>
            <StepPill label="Authorize" status={stepStatus.authorize} />
            <StepPill label="Token" status={stepStatus.token} />
            <StepPill label="Credential" status={stepStatus.credential} />
          </View>
          {savedCredentialMessage ? <Text style={styles.successText}>{savedCredentialMessage}</Text> : null}
        </View>

        {(authorizeResult || tokenResult || credentialResult) && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Live protocol responses</Text>
            {authorizeResult ? (
              <ResultCard title="Authorization response" value={authorizeResult} />
            ) : null}
            {tokenResult ? (
              <ResultCard title="Token response" value={tokenResult} />
            ) : null}
            {credentialResult ? (
              <ResultCard title="Credential response" value={credentialResult} />
            ) : null}
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Session monitor</Text>
          <View style={styles.inlineActions}>
            <PrimaryButton
              title="Refresh session"
              onPress={() => {
                void fetchSession(sessionId).catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                });
              }}
              variant="secondary"
              style={styles.flexButton}
            />
            <PrimaryButton
              title={pollSession ? "Stop polling" : "Poll every 4s"}
              onPress={() => setPollSession((current) => !current)}
              variant="secondary"
              style={styles.flexButton}
            />
          </View>
          <Text style={styles.helperText}>Session ID: {sessionId || "n/a"}</Text>
          <Text style={styles.helperText}>c_nonce: {cNonce || "n/a"}</Text>
          {sessionResult ? <ResultCard title="Protocol session" value={sessionResult} /> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Deferred retrieval</Text>
          <TextInput
            value={deferredTransactionId}
            onChangeText={setDeferredTransactionId}
            placeholder="transaction_id"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
          <View style={styles.inlineActions}>
            <PrimaryButton
              title="Fetch deferred credential"
              onPress={() => {
                void fetchDeferred(deferredTransactionId).catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                });
              }}
              variant="secondary"
            />
          </View>
          {deferredResult ? <ResultCard title="Deferred response" value={deferredResult} /> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Current status</Text>
          <Text style={styles.helperText}>Issuance endpoint: {issuerLabel}</Text>
          <Text style={styles.helperText}>Credential format: {credentialLabel}</Text>
          <Text style={styles.helperText}>Access token: {accessToken ? "issued" : "pending"}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Request failed</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function StepPill({ label, status }: { label: string; status: StepStatus }) {
  return (
    <View style={[styles.stepPill, status === "ready" && styles.stepReady, status === "error" && styles.stepError, status === "running" && styles.stepRunning]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.stepStatus}>{status}</Text>
    </View>
  );
}

function ResultCard({ title, value }: { title: string; value: unknown }) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultValue}>{formatJson(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  shell: {
    gap: 22,
  },
  scannerCard: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backendNote: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  backendLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
  },
  backendValue: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  camera: {
    width: "100%",
    height: 300,
  },
  cameraFallback: {
    padding: 22,
    minHeight: 280,
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.surface,
  },
  cameraTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
  },
  cameraBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  input: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    color: colors.text,
    textAlignVertical: "top",
    fontSize: 14,
  },
  requestInput: {
    minHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    color: colors.text,
    textAlignVertical: "top",
    fontSize: 12,
    fontFamily: "monospace",
  },
  inlineActions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  flexButton: {
    flexGrow: 1,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: 14,
    gap: 8,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.brand600,
  },
  resultValue: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    gap: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: colors.brand600,
  },
  previewValue: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stepPill: {
    minWidth: 98,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  stepRunning: {
    borderColor: "rgba(235,179,8,0.45)",
    backgroundColor: "rgba(251,191,36,0.08)",
  },
  stepReady: {
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  stepError: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.brand600,
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  successText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.brand700,
    fontWeight: "700",
  },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#B42318",
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#8F1D13",
  },
});
