import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { offerKey } from "@salvaspesa/app-core";
import { OfferRow, OfferTile } from "../offer-views";
import { useVisibleOffers } from "../offers";
import { useApp } from "../state";

type Mode = "list" | "grid";

export default function Offerte() {
  const { favorites, loading, updating, refresh } = useApp();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("grid");
  const offers = useVisibleOffers(query);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <TextInput style={styles.search} placeholder="Cerca un prodotto" value={query} onChangeText={setQuery} />
        <View style={styles.toggle}>
          {(["grid", "list"] as const).map((value) => (
            <Pressable key={value} style={[styles.toggleButton, mode === value && styles.toggleOn]} onPress={() => setMode(value)}>
              <Text style={mode === value ? styles.toggleTextOn : undefined}>{value === "grid" ? "Griglia" : "Lista"}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {favorites.length === 0 && <Text style={styles.empty}>Scegli i tuoi supermercati in «La mia zona» per vedere le offerte.</Text>}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Caricamento offerte in corso</Text>
        </View>
      ) : (
        <FlatList
          // Il numero di colonne non si può cambiare al volo: la key forza il rinnovo della lista.
          key={mode}
          data={offers}
          numColumns={mode === "grid" ? 2 : 1}
          keyExtractor={offerKey}
          contentContainerStyle={mode === "grid" ? { paddingHorizontal: 6 } : undefined}
          refreshControl={<RefreshControl refreshing={updating && !loading} onRefresh={() => void refresh(true)} />}
          renderItem={({ item }) => (mode === "grid" ? <OfferTile offer={item} /> : <OfferRow offer={item} />)}
          ListEmptyComponent={favorites.length > 0 ? <Text style={styles.empty}>Nessuna offerta trovata.</Text> : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  toolbar: { padding: 12, gap: 8 },
  search: { padding: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  toggle: { flexDirection: "row", alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", overflow: "hidden", backgroundColor: "#fff" },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 6 },
  toggleOn: { backgroundColor: "#15803d" },
  toggleTextOn: { color: "#fff", fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#334155", fontSize: 16, fontWeight: "600" },
  empty: { textAlign: "center", color: "#64748b", padding: 24 },
});
