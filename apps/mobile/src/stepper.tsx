import { Pressable, StyleSheet, Text, View } from "react-native";

export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => onChange(Math.max(0, value - 1))}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.button} onPress={() => onChange(Math.min(12, value + 1))}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flex: 1 },
  label: { color: "#475569", fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 4, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f7fbff", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 20, lineHeight: 22 },
  value: { fontSize: 18, fontWeight: "700", minWidth: 20, textAlign: "center" },
});
