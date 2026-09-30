import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BackendStatusCard } from "@/components/BackendStatusCard";
import { BrandHeader } from "@/components/BrandHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { SectionHeader } from "@/components/SectionHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWalletState } from "@/hooks/useWalletState";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const { walletStats, recentCredentials, recentActivities, status, error } = useWalletState();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader />

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Personal holder wallet</Text>
          <Text style={styles.heroTitle}>Private, consent-driven credential storage for everyday use.</Text>
          <Text style={styles.heroBody}>
            Keep trusted credentials on device, respond to verifier requests, and disclose only the data that is needed.
          </Text>

          <View style={styles.heroStats}>
            <Metric label="Credentials" value={String(walletStats.credentialCount)} />
            <Metric label="Trusted issuers" value={String(walletStats.trustedIssuers)} />
            <Metric label="Presentations" value={String(walletStats.presentations)} />
            <Metric label="Security" value="Biometric lock" />
          </View>

          <View style={styles.heroActions}>
            <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
            <PrimaryButton title="Browse credentials" onPress={() => router.push("/(tabs)/credentials")} variant="secondary" />
            <PrimaryButton title="Present credential" onPress={() => router.push("/present")} variant="secondary" />
          </View>
        </View>

        <BackendStatusCard />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Wallet data unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        <SectionHeader
          kicker="Wallet view"
          title={recentCredentials.length > 0 ? "Your credentials at a glance." : "No credentials stored yet."}
          body="The wallet reads from persisted local storage, so the dashboard reflects what has actually been received on this device."
        />

        <View style={styles.stack}>
          {recentCredentials.length > 0 ? recentCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              onPress={() => router.push(`/credential/${credential.id}`)}
            />
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{status === "loading" ? "Loading wallet state..." : "Nothing has been received yet."}</Text>
              <Text style={styles.emptyBody}>
                Receive a credential first and it will appear here automatically.
              </Text>
              <View style={styles.inlineActions}>
                <PrimaryButton title="Browse credentials" onPress={() => router.push("/(tabs)/credentials")} variant="secondary" />
                <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
              </View>
            </View>
          )}
        </View>

        <SectionHeader
          kicker="Recent activity"
          title={recentActivities.length > 0 ? "Every significant action is visible." : "No activity yet."}
          body="Credential receipts and presentation submissions are pulled from the saved wallet history."
        />

        <View style={styles.stack}>
          {recentActivities.length > 0 ? recentActivities.map((entry) => (
            <View key={entry.id} style={styles.activityCard}>
              <View style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{entry.title}</Text>
                  <Text style={styles.activityDetail}>{entry.detail}</Text>
                </View>
                <Text style={styles.activityTime}>{entry.timestamp}</Text>
              </View>
            </View>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Awaiting wallet events</Text>
              <Text style={styles.emptyBody}>
                When a credential is received or a presentation is submitted, the history feed will update here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    shadowColor: colors.ink,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroLabel: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
    fontWeight: "800",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: colors.ink,
  },
  heroBody: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
  },
  heroStats: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  metric: {
    width: "47%",
    borderRadius: 20,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: "rgba(214,228,240,0.7)",
    padding: 14,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  heroActions: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  inlineActions: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stack: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 22,
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
  activityCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand500,
    marginTop: 6,
  },
  activityCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  activityDetail: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand700,
  },
});
