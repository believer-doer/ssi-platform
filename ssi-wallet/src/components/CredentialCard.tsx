import { Pressable, StyleSheet, Text, View } from "react-native";
import type { WalletCredential } from "@/types";
import { colors } from "@/theme/colors";

export function CredentialCard({
  credential,
  dark = false,
  onPress,
}: {
  credential: WalletCredential;
  dark?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.category, dark && styles.categoryDark]}>{credential.category}</Text>
          <Text style={[styles.title, dark && styles.titleDark]}>{credential.title}</Text>
        </View>
        <View style={[styles.statusPill, credential.status === "valid" ? styles.valid : styles.neutral]}>
          <Text style={styles.statusText}>{credential.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.issuer, dark && styles.issuerDark]}>{credential.issuer}</Text>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, dark && styles.metaDark]}>{credential.format}</Text>
        <Text style={[styles.meta, dark && styles.metaDark]}>Expires {credential.expiresAt}</Text>
      </View>

      <Text style={[styles.claimCount, dark && styles.claimCountDark]}>
        {credential.claims.length} claims · {credential.trusted ? "Trusted issuer" : "Unverified issuer"}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.ink,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  category: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: colors.brand600,
    fontWeight: "800",
  },
  categoryDark: {
    color: colors.brand300,
  },
  title: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.ink,
    maxWidth: 220,
  },
  titleDark: {
    color: colors.brand50,
  },
  issuer: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  issuerDark: {
    color: colors.brand100,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDark: {
    color: colors.brand200,
  },
  claimCount: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
  claimCountDark: {
    color: colors.brand200,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  valid: {
    backgroundColor: "rgba(18,128,92,0.12)",
  },
  neutral: {
    backgroundColor: "rgba(4,27,45,0.08)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 1,
  },
});
