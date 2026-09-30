import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { useWalletState } from "@/hooks/useWalletState";
import { colors } from "@/theme/colors";

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export default function CredentialsScreen() {
  const { allCredentials, walletStats, status, error, reload } = useWalletState();
  const [query, setQuery] = useState("");

  const filteredCredentials = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return allCredentials;
    }

    return allCredentials.filter((credential) => {
      const haystack = [
        credential.title,
        credential.issuer,
        credential.category,
        credential.format,
        credential.status,
        credential.issuedAt,
        credential.expiresAt,
        ...credential.claims.map((claim) => `${claim.label} ${claim.value}`),
      ].join(" ");
      return matchesQuery(haystack, trimmed);
    });
  }, [allCredentials, query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="Credentials" subtitle="Browse every credential stored on this device" />

        <SectionHeader
          kicker="Inventory"
          title={allCredentials.length > 0 ? `${walletStats.credentialCount} stored credential${walletStats.credentialCount === 1 ? "" : "s"}` : "No stored credentials yet"}
          body="This screen reads from the same persisted wallet state as home, history, settings, and credential detail."
        />

        <View style={styles.summaryCard}>
          <SummaryRow label="Trusted issuers" value={String(walletStats.trustedIssuers)} />
          <SummaryRow label="Presentation history" value={String(walletStats.presentations)} />
          <SummaryRow label="Security state" value={walletStats.secureState} />
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Search credentials</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by issuer, title, claim, or status"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <View style={styles.inlineActions}>
            <PrimaryButton title="Refresh" onPress={() => void reload()} variant="secondary" />
            <PrimaryButton title="Open receive flow" onPress={() => router.push("/receive")} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Wallet data unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        <SectionHeader
          kicker="Stored"
          title={filteredCredentials.length > 0 ? "All stored credentials" : status === "loading" ? "Loading credentials..." : "No matches found"}
          body={filteredCredentials.length > 0 ? "Tap any credential to open the detail view." : "Try a different search term or receive a credential first."}
        />

        <View style={styles.stack}>
          {filteredCredentials.length > 0 ? filteredCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              onPress={() => router.push(`/credential/${credential.id}`)}
            />
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{allCredentials.length === 0 ? "No credentials stored yet." : "No credentials match this search."}</Text>
              <Text style={styles.emptyBody}>
                Receive a credential to populate this browser, or clear the search to view everything stored on device.
              </Text>
              <View style={styles.inlineActions}>
                <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
                <PrimaryButton title="Clear search" onPress={() => setQuery("")} variant="secondary" />
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "700",
  },
  summaryValue: {
    flexShrink: 0,
    fontSize: 13,
    color: colors.ink,
    fontWeight: "800",
    textAlign: "right",
  },
  searchCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  searchLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: colors.brand600,
    fontWeight: "800",
  },
  searchInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  errorCard: {
    borderRadius: 22,
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
  stack: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
