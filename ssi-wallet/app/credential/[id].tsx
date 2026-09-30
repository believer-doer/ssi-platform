import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useWalletState } from "@/hooks/useWalletState";
import { colors } from "@/theme/colors";

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const credentialId = Array.isArray(id) ? id[0] : id;
  const { findCredential, status } = useWalletState();
  const credential = credentialId ? findCredential(credentialId) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <BrandHeader title="Credential detail" subtitle="Inspect issuer, status, and claims before sharing" />

        {credential ? (
          <>
            <View style={styles.card}>
              <Text style={styles.category}>{credential.category}</Text>
              <Text style={styles.title}>{credential.title}</Text>
              <Text style={styles.issuer}>{credential.issuer}</Text>

              <View style={styles.metaRow}>
                <Meta label="Format" value={credential.format} />
                <Meta label="Status" value={credential.status.toUpperCase()} />
              </View>

              <View style={styles.metaRow}>
                <Meta label="Issued" value={credential.issuedAt} />
                <Meta label="Expires" value={credential.expiresAt} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Claims</Text>
              <Text style={styles.sectionBody}>These are the fields available for selective disclosure.</Text>
              <View style={styles.claimList}>
                {credential.claims.map((claim) => (
                  <View key={claim.label} style={styles.claimRow}>
                    <View style={styles.claimCopy}>
                      <Text style={styles.claimLabel}>{claim.label}</Text>
                      <Text style={styles.claimValue}>{claim.value}</Text>
                    </View>
                    <Text style={styles.claimFlag}>{claim.selective ? "Selective" : "Fixed"}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.inlineActions}>
                <PrimaryButton title="Present this credential" onPress={() => router.push("/present")} />
                <PrimaryButton title="Back to wallet" onPress={() => router.back()} variant="secondary" />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{status === "loading" ? "Loading credential..." : "Credential not found."}</Text>
            <Text style={styles.emptyBody}>
              This wallet does not have a stored credential for that id yet. Receive one first and it will appear here.
            </Text>
            <View style={styles.inlineActions}>
              <PrimaryButton title="Receive credential" onPress={() => router.push("/receive")} />
              <PrimaryButton title="Back to wallet" onPress={() => router.back()} variant="secondary" />
            </View>
          </View>
        )}
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
  emptyCard: {
    borderRadius: 24,
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
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  category: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
    fontWeight: "800",
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: colors.ink,
  },
  issuer: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  meta: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: "700",
    color: colors.ink,
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
  claimList: {
    marginTop: 12,
    gap: 12,
  },
  claimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,228,240,0.8)",
  },
  claimCopy: {
    flex: 1,
    marginRight: 12,
  },
  claimLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  claimValue: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  claimFlag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.brand700,
  },
  inlineActions: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
