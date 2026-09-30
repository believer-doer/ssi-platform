import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === "secondary" && styles.secondaryText, variant === "ghost" && styles.ghostText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  text: {
    color: colors.brand50,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryText: {
    color: colors.ink,
  },
  ghostText: {
    color: colors.brand50,
  },
});
