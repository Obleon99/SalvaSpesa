import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GROUPS } from "@salvaspesa/deal-logic";
import { GROUP_EMOJI } from "../groups";
import { Stepper } from "../stepper";
import { useApp } from "../state";

// Ogni nome compare una volta sola; se i negozi sono più di uno lo si indica tra parentesi.
function favoriteSummary(favorites: { name: string }[]): string {
  const counts = new Map<string, number>();
  for (const { name } of favorites) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${name} (${count} negozi)` : name)).join(", ");
}

export default function Profilo() {
  const { categories, toggleCategory, favorites, profile, setProfile, location, restartOnboarding } = useApp();
  const [name, setName] = useState(profile.name);
  const [budget, setBudget] = useState(profile.weeklyBudget === null ? "" : String(profile.weeklyBudget));

  // I valori salvati arrivano dopo l'avvio: si riallineano i campi quando cambiano.
  useEffect(() => {
    setName(profile.name);
    setBudget(profile.weeklyBudget === null ? "" : String(profile.weeklyBudget));
  }, [profile.name, profile.weeklyBudget]);

  const saveName = () => setProfile({ ...profile, name: name.trim() });
  const saveBudget = () => {
    const value = Number(budget.replace(",", "."));
    setProfile({ ...profile, weeklyBudget: budget.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 5000 ? Math.round(value * 100) / 100 : null });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>I tuoi dati</Text>
      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} onEndEditing={saveName} placeholder="Come ti chiami?" />

      <View style={styles.household}>
        <Stepper label="Adulti" value={profile.adults} onChange={(adults) => setProfile({ ...profile, adults })} />
        <Stepper label="Bambini" value={profile.children} onChange={(children) => setProfile({ ...profile, children })} />
      </View>

      <Text style={styles.label}>Soglia di spesa settimanale (€)</Text>
      <TextInput style={styles.input} value={budget} onChangeText={setBudget} onEndEditing={saveBudget} keyboardType="decimal-pad" placeholder="Nessuna soglia" />

      <Text style={styles.label}>Posizione</Text>
      <Text style={styles.value}>{location ? location.label : "Non impostata: cercala in «La mia zona»."}</Text>

      <Text style={[styles.title, { marginTop: 24 }]}>Categorie da mostrare</Text>
      <Text style={styles.muted}>{categories.length === 0 ? "Nessuna selezione: vedi tutte le categorie." : "Vedi solo le categorie scelte."}</Text>
      <View style={styles.chips}>
        {GROUPS.map((group) => {
          const on = categories.includes(group.id);
          return (
            <Pressable key={group.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleCategory(group.id)}>
              <Text style={on ? styles.chipTextOn : undefined}>{`${GROUP_EMOJI[group.icon] ?? "🛒"} ${group.label}`}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.title, { marginTop: 24 }]}>Supermercati preferiti</Text>
      <Text style={styles.muted}>{favorites.length === 0 ? "Nessuno: sceglili in «La mia zona»." : favoriteSummary(favorites)}</Text>
      <Pressable style={styles.guide} onPress={restartOnboarding}>
        <Text style={styles.guideText}>Rivedi la guida</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  title: { fontWeight: "700", fontSize: 16, marginBottom: 4 },
  label: { color: "#475569", fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 15 },
  muted: { color: "#64748b" },
  input: { padding: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  household: { flexDirection: "row", gap: 24 },
  stepper: { flex: 1 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, lineHeight: 22 },
  stepValue: { fontSize: 18, fontWeight: "700", minWidth: 20, textAlign: "center" },
  guide: { marginTop: 28, alignSelf: "flex-start", paddingVertical: 8 },
  guideText: { color: "#15803d", fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff" },
  chipOn: { backgroundColor: "#15803d", borderColor: "#15803d" },
  chipTextOn: { color: "#fff" },
});
