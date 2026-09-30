import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { BackendStatusCard } from "@/components/BackendStatusCard";
import { BrandHeader } from "@/components/BrandHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { SectionHeader } from "@/components/SectionHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWalletState } from "@/hooks/useWalletState";
import { colors } from "@/theme/colors";

export default function SettingsScreen() {
  const { status, error, walletStats, recentCredentials, recentActivities } = useWalletState();
  const [biometricLock, setBiometricLock] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [screenshotProtection, setScreenshotProtection] = useState(true);
  const [cloudRecovery, setCloudRecovery] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="Settings" subtitle="Security, recovery, and wallet experience preferences" />

        <SectionHeader
          kicker="Wallet state"
          title={recentCredentials.length > 0 ? "This wallet has stored credentials." : "This wallet is still empty."}
          body="These summary cards reflect the same persisted wallet state used by the home dashboard, credential detail view, and history feed."
        />

        <View style={styles.card}>
          <SummaryRow label="Load status" value={status} />
          <SummaryRow label="Stored credentials" value={String(walletStats.credentialCount)} />
          <SummaryRow label="Presentation history" value={String(walletStats.presentations)} />
          <SummaryRow label="Trusted issuers" value={String(walletStats.trustedIssuers)} />
          <SummaryRow label="Security state" value={walletStats.secureState} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {recentCredentials.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stored credentials</Text>
            <Text style={styles.sectionBody}>Tap a credential to open its detail view.</Text>
            <View style={styles.credentialStack}>
              {recentCredentials.map((credential) => (
                <CredentialCard
                  key={credential.id}
                  credential={credential}
                  onPress={() => router.push(`/credential/${credential.id}`)}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No credentials stored yet</Text>
            <Text style={styles.sectionBody}>
              Receive a credential first and the same data will appear in home, detail, and history views.
            </Text>
            <View style={styles.inlineActions}>
              <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
              <PrimaryButton title="Present credential" onPress={() => router.push("/present")} variant="secondary" />
            </View>
          </View>
        )}

        {recentActivities.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent wallet activity</Text>
            <Text style={styles.sectionBody}>The latest stored events also drive the history tab.</Text>
            <View style={styles.activityStack}>
              {recentActivities.slice(0, 2).map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityBody}>{activity.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <SectionHeader
          kicker="Security"
          title="Keep the wallet locked by default."
          body="A good holder wallet makes privacy and protection feel calm, not complicated."
        />

        <View style={styles.card}>
          <SettingRow label="Biometric lock" description="Require Face ID, Touch ID, or device biometrics to unlock." value={biometricLock} onChange={setBiometricLock} />
          <SettingRow label="Auto-lock" description="Lock the wallet after inactivity or when the app backgrounds." value={autoLock} onChange={setAutoLock} />
          <SettingRow label="Screenshot protection" description="Prevent screenshots where the platform allows it." value={screenshotProtection} onChange={setScreenshotProtection} last />
        </View>

        <BackendStatusCard />

        <SectionHeader
          kicker="Recovery"
          title="Make device loss survivable."
          body="Recovery is the hardest part of wallet design, so Phase 1 should already include the shape of the flow."
        />

        <View style={styles.card}>
          <SettingRow label="Cloud recovery preview" description="Opt into a future recovery path backed by your trust model." value={cloudRecovery} onChange={setCloudRecovery} />
          <Text style={styles.note}>
            Phase 1 should keep recovery explicit and user-controlled. That means showing the path now, even if the backend recovery service lands later.
          </Text>
          <View style={styles.inlineActions}>
            <PrimaryButton title="Export recovery kit" onPress={() => undefined} />
            <PrimaryButton title="Review device binding" onPress={() => undefined} variant="secondary" />
          </View>
        </View>

        <SectionHeader
          kicker="Trust"
          title="Follow the trust framework used by the platform."
          body="Wallets feel better when the user can see which issuers and verifiers are trusted and why."
        />

        <View style={styles.card}>
          <Bullet text="Trust registry sync on startup and refresh." />
          <Bullet text="Warn on expired, revoked, or untrusted credentials." />
          <Bullet text="Show verifier trust labels before disclosure." />
        </View>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  description,
  value,
  onChange,
  last = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, last && styles.settingRowLast]}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D7E6F1", true: "rgba(34,199,216,0.35)" }}
        thumbColor={value ? colors.brand600 : colors.surface}
      />
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.ink,
  },
  sectionBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  credentialStack: {
    gap: 12,
  },
  activityStack: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    gap: 6,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  activityBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#8F1D13",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
    padding: 12,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,228,240,0.8)",
  },
  settingRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  settingCopy: {
    flex: 1,
    marginRight: 18,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  settingDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  note: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
    backgroundColor: colors.brand500,
  },
  bulletText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}
