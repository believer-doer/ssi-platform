import { StyleSheet, Text, View } from "react-native";
import { BrandGlyph } from "@/components/BrandGlyph";
import { colors } from "@/theme/colors";

export function BrandHeader({
  title = "Veridity Wallet",
  subtitle = "Phase 1 holder wallet MVP",
  dark = false,
}: {
  title?: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <View style={styles.row}>
      <BrandGlyph size={54} dark={dark} />
      <View style={styles.copy}>
        <Text style={[styles.kicker, dark && styles.kickerDark]}>Veridity</Text>
        <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
        <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  copy: {
    marginLeft: 14,
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.brand600,
    fontWeight: "800",
  },
  kickerDark: {
    color: colors.brand300,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.ink,
  },
  titleDark: {
    color: colors.brand50,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  subtitleDark: {
    color: colors.brand200,
  },
});
