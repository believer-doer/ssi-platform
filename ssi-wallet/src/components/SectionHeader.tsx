import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function SectionHeader({
  kicker,
  title,
  body,
  dark = false,
}: {
  kicker: string;
  title: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.kicker, dark && styles.kickerDark]}>{kicker}</Text>
      <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
      <Text style={[styles.body, dark && styles.bodyDark]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "800",
    color: colors.brand600,
  },
  kickerDark: {
    color: colors.brand300,
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.ink,
  },
  titleDark: {
    color: colors.brand50,
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
  },
  bodyDark: {
    color: colors.brand200,
  },
});
