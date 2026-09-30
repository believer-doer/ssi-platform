import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { DisclosureToggle } from "@/components/DisclosureToggle";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { walletEnv } from "@/config/env";
import {
  buildPresentationToken,
  defaultWalletHolderDid,
  extractRequestUri,
  extractSessionIdFromRequestUri,
  parseMaybeJson,
  protocolFetchJson,
  toJsonRecord,
} from "@/lib/protocol";
import {
  loadPresentationHistory,
  loadStoredCredentials,
  savePresentationHistory,
  type StoredCredentialRecord,
} from "@/lib/walletStore";
import type { WalletCredential } from "@/types";
import { colors } from "@/theme/colors";

type StepStatus = "idle" | "running" | "ready" | "error";

function createDefaultRequestBody() {
  return JSON.stringify(
    {
      tenantId: "tenant:demo",
      verifierDid: "did:example:verifier-001",
      holderDid: defaultWalletHolderDid(),
      walletId: "wallet:veridity-mobile",
      format: "vc-jwt",
      presentation_definition: {
        id: "employee-access-check",
        input_descriptors: [
          {
            id: "employee-card",
            constraints: {
              fields: [{ path: ["$.vc.type"] }],
            },
          },
        ],
      },
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

function credentialFormatLabel(format: string): WalletCredential["format"] {
  return format.toLowerCase().includes("sd-jwt") ? "SD-JWT VC" : "JWT VC";
}

function toWalletCredential(record: StoredCredentialRecord): WalletCredential {
  const claims = Object.entries(record.claims ?? {}).map(([label, value]) => ({
    label,
    value: typeof value === "string" ? value : formatJson(value),
    selective: true,
  }));

  return {
    id: record.id,
    title: record.title,
    issuer: record.issuer,
    category: "Received",
    format: credentialFormatLabel(record.format),
    status: record.status === "failed" ? "expired" : "valid",
    issuedAt: new Date(record.receivedAt).toISOString().slice(0, 10),
    expiresAt: "Session bound",
    trusted: true,
    claims: claims.length > 0 ? claims : [{ label: "Credential payload", value: "Available in wallet storage", selective: true }],
  };
}

function extractRequestedClaims(definition: unknown) {
  const record = toJsonRecord(definition);
  const descriptors = Array.isArray(record?.input_descriptors) ? record.input_descriptors : [];
  const claims = new Set<string>();

  for (const descriptor of descriptors) {
    const descriptorRecord = toJsonRecord(descriptor);
    const constraints = toJsonRecord(descriptorRecord?.constraints);
    const fields = Array.isArray(constraints?.fields) ? constraints.fields : [];
    for (const field of fields) {
      const fieldRecord = toJsonRecord(field);
      const paths = Array.isArray(fieldRecord?.path) ? fieldRecord.path : [];
      for (const path of paths) {
        if (typeof path === "string" && path.trim()) {
          claims.add(path.replace(/^\$\.?/, "").replace(/^vc\./, ""));
        }
      }
    }
  }

  return claims.size > 0 ? Array.from(claims) : ["Full legal name", "Date of birth", "Nationality", "Assurance level"];
}

function createDefaultDisclosures(requestedClaims: string[]) {
  return Object.fromEntries(requestedClaims.map((claim) => [claim, true]));
}

export default function PresentScreen() {
  const [requestText, setRequestText] = useState(createDefaultRequestBody);
  const [authorizeResult, setAuthorizeResult] = useState<Record<string, unknown> | null>(null);
  const [requestResult, setRequestResult] = useState<Record<string, unknown> | null>(null);
  const [callbackResult, setCallbackResult] = useState<Record<string, unknown> | null>(null);
  const [sessionResult, setSessionResult] = useState<Record<string, unknown> | null>(null);
  const [storedCredentials, setStoredCredentials] = useState<StoredCredentialRecord[]>([]);
  const [presentationHistoryCount, setPresentationHistoryCount] = useState(0);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [disclosures, setDisclosures] = useState<Record<string, boolean>>({});
  const [requestedClaims, setRequestedClaims] = useState<string[]>(() => extractRequestedClaims(JSON.parse(createDefaultRequestBody()).presentation_definition));
  const [stepStatus, setStepStatus] = useState<{ request: StepStatus; callback: StepStatus }>({
    request: "idle",
    callback: "idle",
  });
  const [pollSession, setPollSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestUri, setRequestUri] = useState("");

  const requestPreview = useMemo(() => parseMaybeJson(requestText), [requestText]);
  const requestDraft = useMemo(() => {
    try {
      return JSON.parse(requestText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [requestText]);

  const availableCredentials = useMemo(() => {
    return storedCredentials.map(toWalletCredential);
  }, [storedCredentials]);

  const selectedCredential = useMemo(
    () => availableCredentials.find((credential) => credential.id === selectedCredentialId) ?? availableCredentials[0],
    [availableCredentials, selectedCredentialId],
  );

  const sessionId = String(
    authorizeResult?.request_uri ? extractSessionIdFromRequestUri(String(authorizeResult.request_uri)) : extractSessionIdFromRequestUri(requestUri),
  ).trim();
  const requestUrl = requestUri || String(authorizeResult?.request_uri || "");
  const requestDocumentUrl = requestUrl || String(authorizeResult?.request_uri || "");
  const responseUri = String(requestResult?.response_uri || "").trim();
  const verifierDid = String(requestResult?.client_id || requestDraft?.verifierDid || "did:example:verifier-001");
  const currentState = String(requestResult?.state || authorizeResult?.state || sessionResult?.state || sessionId || "");
  const currentNonce = String(requestResult?.nonce || authorizeResult?.nonce || "").trim();

  useEffect(() => {
    let active = true;

    async function loadWalletData() {
      try {
        const [credentialsData, historyData] = await Promise.all([loadStoredCredentials(), loadPresentationHistory()]);
        if (!active) {
          return;
        }
        setStoredCredentials(credentialsData);
        setPresentationHistoryCount(historyData.length);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void loadWalletData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (availableCredentials.length === 0) {
      return;
    }

    if (!selectedCredentialId || !availableCredentials.some((credential) => credential.id === selectedCredentialId)) {
      setSelectedCredentialId(availableCredentials[0].id);
    }
  }, [availableCredentials, selectedCredentialId]);

  useEffect(() => {
    if (requestedClaims.length === 0) {
      return;
    }
    setDisclosures((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }
      return createDefaultDisclosures(requestedClaims);
    });
  }, [requestedClaims]);

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

  useEffect(() => {
    const parsedDefinition = toJsonRecord(requestDraft?.presentation_definition);
    if (parsedDefinition) {
      setRequestedClaims(extractRequestedClaims(parsedDefinition));
    }
  }, [requestDraft]);

  function toggleDisclosure(claim: string) {
    setDisclosures((current) => ({ ...current, [claim]: !current[claim] }));
  }

  async function loadRequestDocument(targetRequestUri?: string) {
    const pastedRequest = parseMaybeJson(requestText);
    const pastedRecord = toJsonRecord(pastedRequest);
    const pastedRequestUri =
      typeof pastedRecord?.request_uri === "string"
        ? pastedRecord.request_uri
        : typeof pastedRecord?.requestUri === "string"
          ? pastedRecord.requestUri
          : "";
    const pastedUrl =
      typeof pastedRequest === "string" && /^https?:\/\//i.test(pastedRequest.trim())
        ? pastedRequest.trim()
        : "";
    const resolvedRequestUri = extractRequestUri(
      targetRequestUri || pastedRequestUri || pastedUrl || requestUri || String(authorizeResult?.request_uri || ""),
    );
    if (!resolvedRequestUri) {
      throw new Error("Create or paste a request URI first");
    }

    const document = await protocolFetchJson(resolvedRequestUri);
    const documentRecord = document as Record<string, unknown>;
    setRequestResult(documentRecord);
    setRequestUri(resolvedRequestUri);
    setRequestedClaims(extractRequestedClaims(documentRecord.presentation_definition));
    setDisclosures(createDefaultDisclosures(extractRequestedClaims(documentRecord.presentation_definition)));
    return documentRecord;
  }

  async function createVerifierSession() {
    if (!requestDraft) {
      throw new Error("The verifier request draft is not valid JSON");
    }

    setError(null);
    setStepStatus({ request: "running", callback: "idle" });
    setCallbackResult(null);
    setSessionResult(null);

    const payload = {
      ...requestDraft,
      client_id: String(requestDraft.client_id || requestDraft.verifierDid || "did:example:verifier-001"),
      response_uri: String(requestDraft.response_uri || `${walletEnv.backendOrigin}/vp/callback`),
      response_mode: String(requestDraft.response_mode || "post"),
      format: String(requestDraft.format || "vc-jwt"),
      state: String(requestDraft.state || `vp_${Date.now()}`),
      nonce: String(requestDraft.nonce || `vp_${Date.now()}`),
    };

    const response = await protocolFetchJson(`/v1/${walletEnv.backendDriver}/protocols/oidc4vp/authorize`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const authorizeRecord = response as Record<string, unknown>;
    setAuthorizeResult(authorizeRecord);
    setRequestUri(String(authorizeRecord.request_uri || ""));
    setStepStatus((current) => ({ ...current, request: "ready" }));

    const loaded = await loadRequestDocument(String(authorizeRecord.request_uri || ""));
    setAuthorizeResult((current) => ({ ...(current ?? {}), ...loaded }));
    setPollSession(true);
    return loaded;
  }

  async function submitPresentation() {
    if (!selectedCredential) {
      throw new Error("Choose a credential first");
    }

    setError(null);
    setStepStatus((current) => ({ ...current, callback: "running" }));

    const document = requestResult || (await loadRequestDocument());
    const sourceRecord = storedCredentials.find((credential) => credential.id === selectedCredential.id);
    const credentialPayload = sourceRecord?.credential ?? {
      id: selectedCredential.id,
      title: selectedCredential.title,
      issuer: selectedCredential.issuer,
      claims: selectedCredential.claims,
    };
    const presentationToken = buildPresentationToken({
      nonce: String(document.nonce || authorizeResult?.nonce || currentNonce || ""),
      verifierDid,
      holderDid: defaultWalletHolderDid(),
      credential: credentialPayload,
      presentationDefinitionId: String(toJsonRecord(document.presentation_definition)?.id || "wallet-presentation"),
    });

    const callbackPayload = {
      sessionId: sessionId || String(authorizeResult?.session_id || ""),
      state: String(document.state || currentState || sessionId),
      presentation: {
        holder: defaultWalletHolderDid(),
        verifiableCredential: [credentialPayload],
        requestedClaims,
        disclosures: Object.fromEntries(Object.entries(disclosures).filter(([, value]) => value)),
      },
      vp_token: presentationToken,
      response: {
        presentation_submission: {
          definition_id: String(toJsonRecord(document.presentation_definition)?.id || "wallet-presentation"),
          descriptor_map: [
            {
              id: "credential",
              format: "jwt_vp_json",
              path: "$.presentation.verifiableCredential[0]",
            },
          ],
        },
      },
      format: String(requestDraft?.format || "vc-jwt"),
    };

    const result = await protocolFetchJson(responseUri || `/v1/${walletEnv.backendDriver}/protocols/oidc4vp/callback`, {
      method: "POST",
      body: JSON.stringify(callbackPayload),
    });

    const callbackRecord = result as Record<string, unknown>;
    setCallbackResult(callbackRecord);
    setStepStatus((current) => ({ ...current, callback: "ready" }));

    await savePresentationHistory({
      id: `${sessionId || Date.now()}`,
      sessionId: sessionId || String(authorizeResult?.session_id || ""),
      state: String(callbackRecord.state || document.state || currentState || ""),
      verifierDid,
      submittedAt: new Date().toISOString(),
      requestUri: requestDocumentUrl || undefined,
      result: callbackRecord,
    });

    const historyData = await loadPresentationHistory();
    setPresentationHistoryCount(historyData.length);
    const refreshSessionId = sessionId || String(authorizeResult?.session_id || "");
    if (refreshSessionId) {
      try {
        const refreshed = await protocolFetchJson(`/v1/${walletEnv.backendDriver}/protocols/sessions/${encodeURIComponent(refreshSessionId)}`);
        setSessionResult(refreshed as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="Present" subtitle="Review a verifier request and disclose only what is needed" />

        <SectionHeader
          kicker="Verifier request"
          title="Consent drives the flow."
          body="The wallet now creates and handles a real OIDC4VP session, fetches the request document, and posts the callback response back to the verifier endpoint."
        />

        <View style={styles.backendNote}>
          <Text style={styles.backendLabel}>Configured verifier metadata</Text>
          <Text style={styles.backendValue}>{walletEnv.verifierMetadataUrl}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Request URI or verifier payload</Text>
          <TextInput
            value={requestText}
            onChangeText={setRequestText}
            placeholder="Paste a request URI or verifier session JSON"
            placeholderTextColor={colors.textMuted}
            style={styles.requestInput}
            multiline
          />
          <View style={styles.inlineActions}>
            <PrimaryButton
              title="Create session"
              onPress={() => {
                void createVerifierSession().catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                  setStepStatus({ request: "error", callback: "error" });
                });
              }}
            />
            <PrimaryButton
              title="Load request URI"
              onPress={() => {
                void loadRequestDocument().catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                });
              }}
              variant="secondary"
            />
          </View>
          <Text style={styles.helperText}>
            If you already have a verifier QR or deep link, paste it here. The wallet will fetch the request document and use the live callback URI from the verifier session.
          </Text>
          {(requestPreview && typeof requestPreview === "object") || typeof requestPreview === "string" ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Request preview</Text>
              <Text style={styles.previewValue}>{formatJson(requestPreview)}</Text>
            </View>
          ) : null}
        </View>

        {requestResult ? (
          <View style={styles.requestCard}>
            <Text style={styles.requestKicker}>Live verifier session</Text>
            <Text style={styles.requestVerifier}>{String(requestResult.client_id || verifierDid)}</Text>
            <Text style={styles.requestBody}>{String(requestResult.response_uri || responseUri || "Awaiting callback URI")}</Text>

            <View style={styles.requestMeta}>
              <Meta label="Session" value={sessionId || String(requestResult.state || "n/a")} />
              <Meta label="Nonce" value={String(requestResult.nonce || currentNonce || "n/a")} />
            </View>
          </View>
        ) : null}

        <SectionHeader
          kicker="Choose credential"
          title="Pick the credential you want to present."
          body="The wallet prefers locally received credentials, but falls back to sample data on first run so the presentation flow still works."
        />

        <View style={styles.stack}>
          {availableCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              dark={credential.id === selectedCredentialId}
              onPress={() => setSelectedCredentialId(credential.id)}
            />
          ))}
        </View>

        <View style={styles.selectedCredentialBlock}>
          <Text style={styles.selectedLabel}>Selected credential</Text>
          <Text style={styles.selectedTitle}>{selectedCredential?.title ?? "No credential selected"}</Text>
          <Text style={styles.selectedBody}>
            {selectedCredential ? `${selectedCredential.issuer} · ${selectedCredential.format}` : "Load a credential from the receive flow first."}
          </Text>
        </View>

        <View style={styles.disclosureCard}>
          <Text style={styles.disclosureTitle}>Selective disclosure</Text>
          <Text style={styles.disclosureBody}>
            The verifier request determines the claims the wallet should send. The toggle below mirrors those requested claims.
          </Text>

          <View style={styles.toggleStack}>
            {requestedClaims.map((claim) => (
              <DisclosureToggle
                key={claim}
                label={claim}
                value={Boolean(disclosures[claim])}
                onValueChange={() => toggleDisclosure(claim)}
              />
            ))}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Session summary</Text>
          <Text style={styles.summaryBody}>
            {requestedClaims.length === 0 ? "No request loaded yet." : `Requested claims: ${requestedClaims.join(" · ")}`}
          </Text>
          <Text style={styles.summaryBody}>
            {`Presentation history entries: ${presentationHistoryCount}`}
          </Text>
          <Text style={styles.summaryBody}>
            {`Current state: ${currentState || "n/a"}`}
          </Text>
        </View>

        {callbackResult ? (
          <View style={styles.approvalCard}>
            <Text style={styles.approvalTitle}>Presentation submitted</Text>
            <Text style={styles.approvalBody}>{formatJson(callbackResult)}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            title={stepStatus.callback === "running" ? "Submitting..." : "Approve and present"}
            onPress={() => {
              void submitPresentation().catch((err) => {
                setError(err instanceof Error ? err.message : String(err));
                setStepStatus({ request: "error", callback: "error" });
              });
            }}
            style={!selectedCredential ? { opacity: 0.5 } : undefined}
          />
          <PrimaryButton
            title="Deny"
            onPress={() => setError("Presentation denied by holder.")}
            variant="secondary"
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Session monitor</Text>
          <View style={styles.inlineActions}>
            <PrimaryButton
              title="Refresh session"
              onPress={() => {
                void protocolFetchJson(`/v1/${walletEnv.backendDriver}/protocols/sessions/${encodeURIComponent(sessionId || String(authorizeResult?.session_id || ""))}`).then(
                  (data) => setSessionResult(data as Record<string, unknown>),
                );
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
          {sessionResult ? <ResultCard title="Protocol session" value={sessionResult} /> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Live protocol responses</Text>
          {authorizeResult ? <ResultCard title="Authorize response" value={authorizeResult} /> : null}
          {requestResult ? <ResultCard title="Request document" value={requestResult} /> : null}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
  requestCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: colors.ink,
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
  requestKicker: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: colors.brand300,
    fontWeight: "800",
  },
  requestVerifier: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: colors.brand50,
  },
  requestBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.brand100,
  },
  requestMeta: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  meta: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  metaLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: colors.brand200,
    fontWeight: "800",
  },
  metaValue: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand50,
  },
  stack: {
    gap: 12,
  },
  selectedCredentialBlock: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  selectedLabel: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
    fontWeight: "800",
  },
  selectedTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
  },
  selectedBody: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
  },
  disclosureCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  disclosureTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
  },
  disclosureBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  toggleStack: {
    marginTop: 14,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
  },
  summaryBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  approvalCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(92,242,200,0.35)",
    backgroundColor: colors.backgroundSoft,
    padding: 18,
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.brand700,
  },
  approvalBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
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
  requestInput: {
    minHeight: 220,
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
