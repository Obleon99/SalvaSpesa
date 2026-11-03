import { memo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./icons";
import { colors, radius, shadow } from "./theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Chip = memo(function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]} hitSlop={4}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
});

export function Button({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "ghost"; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, kind === "ghost" && styles.buttonGhost, disabled && { opacity: 0.5 }]}>
      <Text style={[styles.buttonText, kind === "ghost" && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

// Messaggio di stato con icona grande: sostituisce le frasi secche tipo «Nessuna offerta».
export function StateMessage({ icon, title, text, busy, action }: { icon?: IconName; title: string; text?: string; busy?: boolean; action?: ReactNode }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>{busy || !icon ? <ActivityIndicator size="large" color={colors.primary} /> : <Icon name={icon} size={30} color={colors.primary} />}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      {text ? <Text style={styles.stateText}>{text}</Text> : null}
      {action}
    </View>
  );
}

// Segnaposto grigi mentre i dati arrivano: danno l'idea del contenuto senza animazioni pesanti.
export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skeletonImage} />
          <View style={[styles.skeletonLine, { width: "80%" }]} />
          <View style={[styles.skeletonLine, { width: "50%" }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, ...shadow },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  button: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, alignItems: "center" },
  buttonGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  state: { alignItems: "center", gap: 8, paddingVertical: 36, paddingHorizontal: 28 },
  stateIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  stateTitle: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 4 },
  stateText: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  skeletonWrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 },
  skeleton: { width: "50%", padding: 6 },
  skeletonImage: { aspectRatio: 1, borderRadius: radius.md, backgroundColor: "#e7ece9", marginBottom: 8 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: "#e7ece9", marginBottom: 6 },
});
