import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GROUPS } from "@salvaspesa/deal-logic";
import { Icon, type IconName } from "../icons";
import { useApp } from "../state";
import { colors, radius } from "../theme";
import { Button, Card, Chip } from "../ui";

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Title icon="user" text="I tuoi dati" />
        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} onEndEditing={saveName} placeholder="Come ti chiami?" placeholderTextColor={colors.muted} />

        <Text style={styles.label}>Soglia di spesa settimanale (€)</Text>
        <TextInput style={styles.input} value={budget} onChangeText={setBudget} onEndEditing={saveBudget} keyboardType="decimal-pad" placeholder="Nessuna soglia" placeholderTextColor={colors.muted} />

        <Text style={styles.label}>Posizione</Text>
        <Text style={styles.value}>{location ? location.label : "Non impostata: cercala in «La mia zona»."}</Text>
      </Card>

      <Card style={styles.card}>
        <Title icon="list" text="Categorie da mostrare" />
        <Text style={styles.muted}>{categories.length === 0 ? "Nessuna selezione: vedi tutte le categorie." : "Vedi solo le categorie scelte."}</Text>
        <View style={styles.chips}>
          {GROUPS.map((group) => (
            <Chip key={group.id} on={categories.includes(group.id)} onPress={() => toggleCategory(group.id)} label={group.label} />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Title icon="star" text="Supermercati preferiti" />
        <Text style={styles.muted}>{favorites.length === 0 ? "Nessuno: sceglili in «La mia zona»." : favoriteSummary(favorites)}</Text>
      </Card>

      <View style={{ alignItems: "center", marginTop: 6 }}>
        <Button label="Rivedi la guida" kind="ghost" onPress={restartOnboarding} />
      </View>
      <Text style={styles.signature}>SalvaSpesa · creata da Obleon</Text>
    </ScrollView>
  );
}

function Title({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.titleRow}>
      <Icon name={icon} size={18} color={colors.primary} />
      <Text style={styles.title}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  signature: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 4 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 14, paddingBottom: 28 },
  card: { gap: 4 },
  title: { fontWeight: "800", fontSize: 16, color: colors.text },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 15, color: colors.text },
  muted: { color: colors.muted },
  input: { padding: 12, borderRadius: radius.sm, backgroundColor: "#eef5fd", borderWidth: 1, borderColor: colors.line, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
});
