import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { useWalletState } from "@/hooks/useWalletState";
import { colors } from "@/theme/colors";

export default function HistoryScreen() {
  const { recentActivities, status, error } = useWalletState();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="History" subtitle="Track issuance, presentations, trust, and verification activity" />

        <SectionHeader
          kicker="Activity log"
          title="A simple audit trail for the holder."
          body="The wallet should make past actions easy to review without overwhelming the person using it."
        />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>History unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.timeline}>
          {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
            <View key={activity.id} style={styles.itemRow}>
              <View style={styles.trackColumn}>
                <View style={styles.trackDot} />
                {index < recentActivities.length - 1 ? <View style={styles.trackLine} /> : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.kicker}>{activity.kind}</Text>
                <Text style={styles.title}>{activity.title}</Text>
                <Text style={styles.body}>{activity.detail}</Text>
                <Text style={styles.time}>{activity.timestamp}</Text>
              </View>
            </View>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{status === "loading" ? "Loading history..." : "No history entries yet."}</Text>
              <Text style={styles.emptyBody}>
                Once a credential is received or a presentation is submitted, those events will show up here.
              </Text>
              <View style={styles.inlineActions}>
                <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
                <PrimaryButton title="Present credential" onPress={() => router.push("/present")} variant="secondary" />
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
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
  timeline: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  inlineActions: {
    marginTop: 4,
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
  itemRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  trackColumn: {
    width: 24,
    alignItems: "center",
  },
  trackDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand500,
    marginTop: 18,
  },
  trackLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(214,228,240,0.9)",
    marginTop: 8,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  kicker: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: colors.brand600,
    fontWeight: "800",
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  time: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand700,
  },
});
