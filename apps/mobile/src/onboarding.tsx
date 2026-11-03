import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GROUPS } from "@salvaspesa/deal-logic";
import { Icon, type IconName } from "./icons";
import { Stepper } from "./stepper";
import { useApp, type Profile } from "./state";
import { colors } from "./theme";

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  { icon: "cart", title: "Benvenuto in SpesaChiara", text: "Confronta le offerte dei supermercati vicino a te e scopri dove conviene davvero fare la spesa." },
  { icon: "pin", title: "Scegli i tuoi supermercati", text: "In «La mia zona» trovi i negozi intorno a te: tocca la stella per aggiungerli ai preferiti. Le offerte vengono scaricate dai volantini." },
  { icon: "tag", title: "Trova le occasioni", text: "In «Offerte» vedi prodotti e prezzi in griglia o in lista, ordinati per sconto. Nella Home trovi le migliori del momento." },
  { icon: "shield", title: "I tuoi dati restano con te", text: "Non c'è nessun server né account: profilo, preferiti e offerte sono salvati solo su questo telefono." },
];

export function Onboarding() {
  const { completeOnboarding, profile: saved, categories: savedCategories } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(saved.name);
  const [adults, setAdults] = useState(saved.adults);
  const [children, setChildren] = useState(saved.children);
  const [budget, setBudget] = useState(saved.weeklyBudget === null ? "" : String(saved.weeklyBudget));
  const [categories, setCategories] = useState<string[]>(savedCategories);

  const onProfileStep = step === SLIDES.length;
  const parsed = budget.trim() === "" ? null : Number(budget.replace(",", "."));
  const budgetInvalid = parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 5000);

  function finish() {
    if (budgetInvalid) return;
    const profile: Profile = { name: name.trim(), adults, children, weeklyBudget: parsed === null ? null : Math.round(parsed * 100) / 100 };
    completeOnboarding(profile, categories);
  }

  const toggle = (id: string) => setCategories((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top + 16 }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!onProfileStep ? (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Icon name={SLIDES[step].icon} size={56} color={colors.primary} strokeWidth={1.6} />
            </View>
            <Text style={styles.title}>{SLIDES[step].title}</Text>
            <Text style={styles.text}>{SLIDES[step].text}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.title}>Parlaci di te</Text>
            <Text style={styles.text}>Servono a personalizzare offerte e consigli. Puoi cambiarli in qualsiasi momento dal Profilo.</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Come ti chiami?" />

            <View style={styles.household}>
              <Stepper label="Adulti" value={adults} onChange={setAdults} />
              <Stepper label="Bambini" value={children} onChange={setChildren} />
            </View>

            <Text style={styles.label}>Soglia di spesa settimanale (€)</Text>
            <TextInput style={[styles.input, budgetInvalid && styles.inputInvalid]} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="Nessuna soglia" />
            {budgetInvalid && <Text style={styles.error}>Inserisci un importo tra 0 e 5000.</Text>}

            <Text style={styles.label}>Categorie che ti interessano</Text>
            <Text style={styles.hint}>Se non ne scegli nessuna le vedrai tutte.</Text>
            <View style={styles.chips}>
              {GROUPS.map((group) => {
                const on = categories.includes(group.id);
                return (
                  <Pressable key={group.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggle(group.id)}>
                    <Text style={on ? styles.chipTextOn : undefined}>{group.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
        <View style={styles.dots}>
          {Array.from({ length: SLIDES.length + 1 }, (_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.buttons}>
          {step > 0 ? (
            <Pressable style={styles.secondary} onPress={() => setStep(step - 1)}>
              <Text style={styles.secondaryText}>Indietro</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.secondary} onPress={() => setStep(SLIDES.length)}>
              <Text style={styles.secondaryText}>Salta la guida</Text>
            </Pressable>
          )}
          <Pressable style={[styles.primary, onProfileStep && budgetInvalid && styles.disabled]} onPress={onProfileStep ? finish : () => setStep(step + 1)}>
            <Text style={styles.primaryText}>{onProfileStep ? "Inizia" : "Avanti"}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: 24, justifyContent: "center" },
  slide: { alignItems: "center", gap: 12 },
  iconCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", color: "#0f172a" },
  text: { fontSize: 16, color: "#475569", textAlign: "center", lineHeight: 23, marginTop: 4 },
  label: { color: "#475569", fontSize: 12, fontWeight: "600", marginTop: 16, marginBottom: 4, textTransform: "uppercase" },
  hint: { color: "#64748b", fontSize: 12 },
  input: { padding: 10, borderRadius: 10, backgroundColor: "#f7fbff", borderWidth: 1, borderColor: "#e2e8f0" },
  inputInvalid: { borderColor: "#dc2626" },
  error: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  household: { flexDirection: "row", gap: 24 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f7fbff" },
  chipOn: { backgroundColor: "#1d5fd1", borderColor: "#1d5fd1" },
  chipTextOn: { color: "#fff" },
  footer: { padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#f7fbff" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#cbd5e1" },
  dotOn: { backgroundColor: "#1d5fd1", width: 20 },
  buttons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secondary: { paddingVertical: 12, paddingHorizontal: 8 },
  secondaryText: { color: "#475569", fontWeight: "600" },
  primary: { backgroundColor: "#1d5fd1", paddingVertical: 13, paddingHorizontal: 30, borderRadius: 999 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.4 },
});
