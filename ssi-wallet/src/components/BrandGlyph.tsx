import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "@/theme/colors";

export function BrandGlyph({ size = 52, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: dark ? colors.ink : colors.surface,
        },
      ]}
    >
      <LinearGradient colors={dark ? (["#7EF7D5", "#46D8F0", "#5A8CFF"] as const) : gradients.brand} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.inner, { borderRadius: size * 0.2, backgroundColor: dark ? "rgba(6,17,31,0.92)" : "rgba(255,255,255,0.88)" }]} />
      <Text style={[styles.mark, { fontSize: size * 0.56, color: dark ? colors.brand50 : colors.ink }]}>V</Text>
      <View
        style={[
          styles.dot,
          {
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: dark ? colors.brand300 : colors.brand500,
            right: size * 0.12,
            top: size * 0.12,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  inner: {
    position: "absolute",
    top: 9,
    right: 9,
    bottom: 9,
    left: 9,
  },
  mark: {
    fontWeight: "900",
    letterSpacing: -2,
  },
  dot: {
    position: "absolute",
  },
});
