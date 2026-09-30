import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { walletEnv } from "@/config/env";
import { colors } from "@/theme/colors";

type ProbeState = "checking" | "ready" | "offline";

type EndpointStatus = {
  state: ProbeState;
  detail: string;
};

type BackendProbe = {
  issuer: EndpointStatus;
  verifier: EndpointStatus;
  checkedAt: string | null;
};

const initialStatus: BackendProbe = {
  issuer: { state: "checking", detail: "Checking issuer metadata..." },
  verifier: { state: "checking", detail: "Checking verifier metadata..." },
  checkedAt: null,
};

export function BackendStatusCard() {
  const [probe, setProbe] = useState<BackendProbe>(initialStatus);

  useEffect(() => {
    let isActive = true;

    async function probeBackend() {
      const [issuerResult, verifierResult] = await Promise.allSettled([
        fetch(walletEnv.issuerMetadataUrl),
        fetch(walletEnv.verifierMetadataUrl),
      ]);

      if (!isActive) {
        return;
      }

      setProbe({
        issuer: describeResult(issuerResult, "Issuer metadata"),
        verifier: describeResult(verifierResult, "Verifier metadata"),
        checkedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    void probeBackend();

    return () => {
      isActive = false;
    };
  }, []);

  const backendReady = probe.issuer.state === "ready" && probe.verifier.state === "ready";

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Backend connection</Text>
      <Text style={styles.title}>Phase 2 now reads real backend config.</Text>
      <Text style={styles.body}>
        The wallet is configured against {walletEnv.backendOrigin} with API base {walletEnv.backendApiBaseUrl}.
      </Text>

      <View style={styles.metaRow}>
        <Meta label="Driver" value={walletEnv.backendDriver} />
        <Meta label="Issuer" value={probe.issuer.detail} tone={probe.issuer.state} />
        <Meta label="Verifier" value={probe.verifier.detail} tone={probe.verifier.state} />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.footerState, backendReady && styles.footerStateReady]}>
          {backendReady ? "Backend metadata is reachable." : "Backend metadata is still warming up."}
        </Text>
        <View style={styles.checkingRow}>
          {probe.issuer.state === "checking" || probe.verifier.state === "checking" ? (
            <>
              <ActivityIndicator color={colors.brand600} />
              <Text style={styles.checkingText}>Probing metadata endpoints</Text>
            </>
          ) : null}
        </View>
      </View>

      {probe.checkedAt ? <Text style={styles.checkedAt}>Checked at {probe.checkedAt}</Text> : null}
    </View>
  );
}

function describeResult(
  result: PromiseSettledResult<Response>,
  label: string,
): EndpointStatus {
  if (result.status === "fulfilled" && result.value.ok) {
    return {
      state: "ready",
      detail: `${label} reachable`,
    };
  }

  return {
    state: "offline",
    detail: `${label} offline`,
  };
}

function Meta({
  label,
  value,
  tone = "ready",
}: {
  label: string;
  value: string;
  tone?: ProbeState;
}) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, tone === "offline" && styles.metaValueOffline, tone === "checking" && styles.metaValueChecking]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  meta: {
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(214,228,240,0.9)",
    backgroundColor: colors.surfaceAlt,
    padding: 14,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.brand600,
  },
  metaValue: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    fontWeight: "700",
  },
  metaValueOffline: {
    color: "#B04A49",
  },
  metaValueChecking: {
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  footerState: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "700",
  },
  footerStateReady: {
    color: colors.brand700,
  },
  checkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
  },
  checkedAt: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
