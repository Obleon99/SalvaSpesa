import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { fetchNearbyStores, formatDistance, geocodeAddress, haversineKm, type LatLng, type StoreWithDistance } from "@salvaspesa/app-core";
import { StoresMap } from "../stores-map";
import { useApp } from "../state";

const RADIUS_KM = 8;
// Oltre questa distanza dal punto cercato compare «Cerca in quest'area».
const MOVED_KM = 0.4;

export default function Zona() {
  const { favorites, toggleFavorite, data, setLocation } = useApp();
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [searchCenter, setSearchCenter] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  // Cerca i supermercati attorno a un punto qualsiasi e centra la mappa lì.
  async function loadAround(point: LatLng) {
    const found = await fetchNearbyStores(point.lat, point.lng, RADIUS_KM);
    setSelectedId(null);
    setSearchCenter(point);
    setMapCenter(point);
    setStores(found.map((s) => ({ ...s, distanceKm: haversineKm(point, s) })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)));
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      Alert.alert("Errore", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const locate = () =>
    run(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Posizione negata", "Serve il permesso per trovare i supermercati vicini. Puoi comunque cercare un indirizzo.");
        return;
      }
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
      if (!position) throw new Error("Posizione non disponibile: attiva la localizzazione del telefono oppure cerca un indirizzo.");
      const here = { lat: position.coords.latitude, lng: position.coords.longitude };
      const place = await Location.reverseGeocodeAsync({ latitude: here.lat, longitude: here.lng }).catch(() => []);
      const label = [place[0]?.city ?? place[0]?.subregion, place[0]?.region].filter(Boolean).join(", ");
      setLocation({ ...here, label: label || `${here.lat.toFixed(3)}, ${here.lng.toFixed(3)}` });
      await loadAround(here);
    });

  const searchAddress = () =>
    run(async () => {
      Keyboard.dismiss();
      const place = await geocodeAddress(address);
      if (!place) {
        Alert.alert("Indirizzo non trovato", "Prova a scrivere via, numero e città (per esempio «Via Roma 10, Genova»).");
        return;
      }
      await loadAround({ lat: place.lat, lng: place.lng });
    });

  const searchHere = () => mapCenter && run(() => loadAround(mapCenter));

  const favoriteIds = useMemo(() => favorites.map((f) => f.id), [favorites]);
  const selected = stores.find((s) => s.id === selectedId) ?? null;
  const isFavorite = selected ? favoriteIds.includes(selected.id) : false;
  const source = selected ? data?.sources.find((s) => s.storeId === selected.id) : undefined;
  const moved = searchCenter && mapCenter ? haversineKm(searchCenter, mapCenter) > MOVED_KM : false;

  return (
    <View style={styles.screen}>
      {searchCenter ? (
        <StoresMap stores={stores} favoriteIds={favoriteIds} center={searchCenter} selectedId={selectedId} onSelect={setSelectedId} onMove={setMapCenter} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyText}>Cerca un indirizzo oppure usa la tua posizione: vedrai i supermercati sulla mappa e potrai scegliere i tuoi preferiti.</Text>
        </View>
      )}

      <View style={styles.top}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Cerca un indirizzo o una città"
            returnKeyType="search"
            onSubmitEditing={searchAddress}
          />
          <Pressable style={styles.go} onPress={searchAddress} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.goText}>Cerca</Text>}
          </Pressable>
        </View>
        <Pressable style={styles.chip} onPress={locate} disabled={busy}>
          <Text style={styles.chipText}>📍 Usa la mia posizione</Text>
        </Pressable>
        {moved && (
          <Pressable style={[styles.chip, styles.chipPrimary]} onPress={searchHere} disabled={busy}>
            <Text style={[styles.chipText, { color: "#fff" }]}>🔎 Cerca supermercati in quest'area</Text>
          </Pressable>
        )}
      </View>

      {!selected && stores.length > 0 && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>🟠 volantino disponibile   ⚪ non ancora   🟢 preferito</Text>
        </View>
      )}

      {searchCenter && stores.length === 0 && !busy && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>Nessun supermercato trovato qui.</Text>
        </View>
      )}

      {selected && (
        <View style={styles.sheet}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.muted}>{`${selected.chainName}${selected.distanceKm != null ? ` · ${formatDistance(selected.distanceKm)}` : ""}`}</Text>
            {selected.address ? <Text style={styles.muted}>{selected.address}</Text> : null}
            {isFavorite && source && <Text style={styles.status}>{source.status === "ok" ? `${source.offerCount} offerte` : (source.note ?? "volantino non disponibile")}</Text>}
          </View>
          <Pressable
            style={[styles.favorite, isFavorite && styles.favoriteOn]}
            onPress={() => toggleFavorite({ id: selected.id, name: selected.name, chainId: selected.chainId, chainName: selected.chainName, lat: selected.lat, lng: selected.lng })}
          >
            <Text style={[styles.favoriteText, isFavorite && { color: "#fff" }]}>{isFavorite ? "★ Preferito" : "☆ Aggiungi"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  top: { position: "absolute", top: 12, left: 12, right: 12, gap: 8, alignItems: "flex-start" },
  searchRow: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", elevation: 4 },
  go: { paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#15803d", alignItems: "center", justifyContent: "center", elevation: 4 },
  goText: { color: "#fff", fontWeight: "700" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", elevation: 4 },
  chipPrimary: { backgroundColor: "#15803d", borderColor: "#15803d" },
  chipText: { fontWeight: "600", color: "#0f172a" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { textAlign: "center", color: "#64748b", fontSize: 15, lineHeight: 22 },
  legend: { position: "absolute", left: 12, bottom: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.92)", elevation: 3 },
  legendText: { fontSize: 12, color: "#334155" },
  sheet: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", elevation: 6 },
  name: { fontWeight: "700", fontSize: 16 },
  muted: { color: "#64748b", fontSize: 12 },
  status: { color: "#15803d", fontSize: 12, marginTop: 2 },
  favorite: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#15803d" },
  favoriteOn: { backgroundColor: "#15803d" },
  favoriteText: { color: "#15803d", fontWeight: "700" },
});
