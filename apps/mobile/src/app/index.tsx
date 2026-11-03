import { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { offerKey } from "@salvaspesa/app-core";
import { OfferTile, euro } from "../offer-views";
import { useVisibleOffers } from "../offers";
import { useApp } from "../state";
import { colors, radius, shadow } from "../theme";
import { Button, Card, SkeletonTiles, StateMessage } from "../ui";

function greeting(name: string): string {
  const hour = new Date().getHours();
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  return name ? `${hello}, ${name}!` : `${hello}!`;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export default function Home() {
  const insets = useSafeAreaInsets();
  const { profile, favorites, data, loading, updating, progress, location, refresh } = useApp();
  const offers = useVisibleOffers();
  const best = useMemo(() => offers.filter((o) => o.discountPercent != null).slice(0, 10), [offers]);
  const chains = useMemo(() => new Set(offers.map((o) => o.chainName)).size, [offers]);
  const people = profile.adults + profile.children;
  const busy = loading || updating;
  // Motivi per cui un supermercato non ha dato offerte, mostrati solo quando serve capire cosa è andato storto.
  const problems = useMemo(() => [...new Set((data?.sources ?? []).filter((s) => s.status !== "ok" && s.note).map((s) => `${s.chainName}: ${s.note}`))].slice(0, 4), [data]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroTitle}>{greeting(profile.name)}</Text>
        <Text style={styles.heroText}>Le offerte dei tuoi supermercati, scaricate direttamente sul telefono.</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {busy ? `🔄  ${progress || "Preparo le offerte…"}` : data?.generatedAt ? `✅  Aggiornate alle ${time(data.generatedAt)}` : "Nessun aggiornamento ancora"}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat emoji="🏷️" value={String(offers.length)} label="offerte" />
        <Stat emoji="🏪" value={String(chains)} label="insegne" />
        <Stat emoji="⭐" value={String(favorites.length)} label="preferiti" />
      </View>

      <Card style={styles.info}>
        <Text style={styles.infoLine}>📍  {location ? location.label : "Posizione non impostata"}</Text>
        <Text style={styles.infoLine}>👨‍👩‍👧  {people === 1 ? "1 persona" : `${people} persone`} in famiglia</Text>
        <Text style={styles.infoLine}>💶  {profile.weeklyBudget != null ? `Soglia settimanale ${euro(profile.weeklyBudget)}` : "Nessuna soglia di spesa impostata"}</Text>
      </Card>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Le migliori offerte</Text>
        {best.length > 0 && (
          <Pressable onPress={() => router.push("/offerte")} hitSlop={8}>
            <Text style={styles.link}>Vedi tutte ›</Text>
          </Pressable>
        )}
      </View>

      {best.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={best}
          keyExtractor={offerKey}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          renderItem={({ item }) => <OfferTile offer={item} width={164} />}
        />
      ) : busy ? (
        <>
          <StateMessage busy emoji="" title="Sto scaricando le offerte" text={progress ? `${progress}\nCi vorrà un momento, solo la prima volta.` : "Ci vorrà un momento, solo la prima volta."} />
          <SkeletonTiles count={2} />
        </>
      ) : favorites.length === 0 ? (
        <StateMessage
          emoji="🗺️"
          title="Scegli i tuoi supermercati"
          text="Aggiungi i negozi vicino a te e qui vedrai le offerte migliori."
          action={<Button label="Apri la mappa" onPress={() => router.push("/zona")} />}
        />
      ) : (
        <StateMessage
          emoji="🛒"
          title="Ancora nessuna offerta"
          text={problems.length > 0 ? problems.join("\n") : "I volantini dei tuoi supermercati non sono ancora disponibili."}
          action={<Button label="Riprova" onPress={() => void refresh(true)} />}
        />
      )}
    </ScrollView>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 6 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroText: { color: "#d1fae5", fontSize: 14, lineHeight: 20 },
  pill: { alignSelf: "flex-start", marginTop: 10, maxWidth: "100%", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 10, paddingHorizontal: 14, marginTop: -34 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.card, ...shadow },
  statEmoji: { fontSize: 18 },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  statLabel: { color: colors.muted, fontSize: 12 },
  info: { marginHorizontal: 14, marginTop: 14, gap: 6 },
  infoLine: { fontSize: 14, color: "#334155" },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 18, marginTop: 22, marginBottom: 6 },
  section: { fontWeight: "800", fontSize: 18, color: colors.text },
  link: { color: colors.primary, fontWeight: "700" },
});
