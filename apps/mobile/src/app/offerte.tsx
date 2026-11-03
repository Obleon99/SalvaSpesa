import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { offerKey, type OfferView } from "@salvaspesa/app-core";
import { Icon } from "../icons";
import { OfferRow, OfferTile } from "../offer-views";
import { useVisibleOffers } from "../offers";
import { useApp } from "../state";
import { colors, radius, shadow } from "../theme";
import { Button, SkeletonTiles, StateMessage } from "../ui";

type Mode = "list" | "grid";

export default function Offerte() {
  const { favorites, loading, updating, progress, refresh } = useApp();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("grid");
  const offers = useVisibleOffers(query);
  const busy = loading || updating;

  const renderItem = useCallback(({ item }: { item: OfferView }) => (mode === "grid" ? <OfferTile offer={item} /> : <OfferRow offer={item} />), [mode]);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput style={styles.search} placeholder="Cerca un prodotto" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Icon name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.toggle}>
          {(["grid", "list"] as const).map((value) => (
            <Pressable key={value} style={[styles.toggleButton, mode === value && styles.toggleOn]} onPress={() => setMode(value)}>
              <Icon name={value} size={15} color={mode === value ? "#fff" : colors.text} />
              <Text style={[styles.toggleText, mode === value && styles.toggleTextOn]}>{value === "grid" ? "Griglia" : "Lista"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading && offers.length === 0 ? (
        <>
          <StateMessage busy title="Sto scaricando le offerte" text={progress || "Ci vorrà un momento, solo la prima volta."} />
          <SkeletonTiles count={4} />
        </>
      ) : (
        <FlatList
          // Il numero di colonne non si può cambiare al volo: la key forza il rinnovo della lista.
          key={mode}
          data={offers}
          numColumns={mode === "grid" ? 2 : 1}
          keyExtractor={offerKey}
          contentContainerStyle={[{ paddingBottom: 16 }, mode === "grid" && { paddingHorizontal: 8 }]}
          // Si disegnano solo le righe visibili e poco intorno: lista fluida anche con migliaia di offerte.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={updating && !loading} onRefresh={() => void refresh(true)} colors={[colors.primary]} />}
          renderItem={renderItem}
          ListHeaderComponent={updating ? <Text style={styles.updating}>{progress || "Aggiorno le offerte…"}</Text> : undefined}
          ListEmptyComponent={
            favorites.length === 0 ? (
              <StateMessage icon="map" title="Scegli i tuoi supermercati" text="Aggiungi i negozi vicino a te per vedere le loro offerte." action={<Button label="Apri la mappa" onPress={() => router.push("/zona")} />} />
            ) : busy ? (
              <StateMessage busy title="Sto scaricando le offerte" text={progress} />
            ) : query ? (
              <StateMessage icon="search" title="Nessun risultato" text={`Non ho trovato offerte per «${query}». Prova con un'altra parola.`} />
            ) : (
              <StateMessage icon="cart" title="Ancora nessuna offerta" text="I volantini dei tuoi supermercati non sono ancora disponibili." action={<Button label="Riprova" onPress={() => void refresh(true)} />} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { padding: 14, gap: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow },
  search: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text },
  toggle: { flexDirection: "row", alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#dde9f7", padding: 3 },
  toggleButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill },
  toggleOn: { backgroundColor: colors.primary },
  toggleText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  toggleTextOn: { color: "#fff" },
  updating: { textAlign: "center", color: colors.muted, fontSize: 12, paddingBottom: 6 },
});
