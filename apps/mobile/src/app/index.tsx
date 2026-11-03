import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { offerKey } from "@salvaspesa/app-core";
import { OfferTile, euro } from "../offer-views";
import { useVisibleOffers } from "../offers";
import { useApp } from "../state";

function greeting(name: string): string {
  const hour = new Date().getHours();
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  return name ? `${hello}, ${name}!` : `${hello}!`;
}

export default function Home() {
  const { profile, favorites, data, loading, updating, location } = useApp();
  const offers = useVisibleOffers();
  const best = offers.filter((o) => o.discountPercent != null).slice(0, 10);
  const chains = new Set(offers.map((o) => o.chainName)).size;
  const people = profile.adults + profile.children;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{greeting(profile.name)}</Text>
        <Text style={styles.heroText}>Le offerte dei tuoi supermercati, scaricate direttamente sul telefono.</Text>
      </View>

      <View style={styles.stats}>
        <Stat value={String(offers.length)} label="offerte" />
        <Stat value={String(chains)} label="insegne" />
        <Stat value={String(favorites.length)} label="preferiti" />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoLine}>📍 {location ? location.label : "Posizione non impostata: aprila da «La mia zona»"}</Text>
        <Text style={styles.infoLine}>👨‍👩‍👧 {people === 1 ? "1 persona" : `${people} persone`} in famiglia</Text>
        <Text style={styles.infoLine}>💶 {profile.weeklyBudget != null ? `Soglia settimanale ${euro(profile.weeklyBudget)}` : "Nessuna soglia di spesa impostata"}</Text>
        {updating && !loading ? (
          <Text style={styles.infoLine}>🔄 Aggiornamento in corso…</Text>
        ) : (
          data?.generatedAt && <Text style={styles.infoLine}>🕒 Aggiornate alle {new Date(data.generatedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</Text>
        )}
      </View>

      <Text style={styles.section}>Le migliori offerte</Text>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Caricamento offerte in corso</Text>
        </View>
      ) : best.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={best}
          keyExtractor={offerKey}
          contentContainerStyle={{ paddingHorizontal: 6 }}
          renderItem={({ item }) => <OfferTile offer={item} width={160} />}
        />
      ) : (
        <Text style={styles.empty}>{favorites.length === 0 ? "Scegli i tuoi supermercati in «La mia zona» per vedere le offerte." : "Nessuna offerta disponibile al momento."}</Text>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  hero: { backgroundColor: "#15803d", padding: 20, gap: 4 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroText: { color: "#dcfce7", fontSize: 14 },
  stats: { flexDirection: "row", gap: 8, padding: 12 },
  stat: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#15803d" },
  statLabel: { color: "#64748b", fontSize: 12 },
  info: { marginHorizontal: 12, padding: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", gap: 4 },
  infoLine: { fontSize: 13, color: "#334155" },
  section: { fontWeight: "700", fontSize: 17, marginHorizontal: 16, marginTop: 20, marginBottom: 6 },
  loading: { alignItems: "center", gap: 12, padding: 32 },
  loadingText: { color: "#334155", fontSize: 16, fontWeight: "600" },
  empty: { textAlign: "center", color: "#64748b", padding: 24 },
});
