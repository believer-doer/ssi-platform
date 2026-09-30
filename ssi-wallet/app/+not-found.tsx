import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "@/components/BrandHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors } from "@/theme/colors";

export default function NotFoundScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <BrandHeader title="Page not found" subtitle="This wallet route does not exist" />
        <Text style={styles.body}>
          The route you opened is not part of the holder wallet MVP yet. Return to the wallet home screen and continue from there.
        </Text>
        <View style={styles.actions}>
          <PrimaryButton title="Go home" onPress={() => router.replace("/")} />
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 22,
  },
  body: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actions: {
    marginTop: 18,
  },
});
