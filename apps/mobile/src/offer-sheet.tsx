import { useSyncExternalStore } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flyerUrl, type OfferView } from "@salvaspesa/app-core";
import { ChainLogo } from "./chain-logo";
import { Icon } from "./icons";
import { itemFromOffer } from "./list";
import { euro } from "./offer-views";
import { useApp } from "./state";
import { colors, radius } from "./theme";

// Offerta aperta nella scheda di dettaglio: uno stato minuscolo condiviso, senza dover passare proprietà tra le schermate.
let current: OfferView | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
export function openOffer(offer: OfferView) {
  current = offer;
  emit();
}
const closeOffer = () => {
  current = null;
  emit();
};
const useCurrent = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );

const day = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
const unitName = (unit: string) => (unit === "l" ? "litro" : unit === "kg" ? "chilo" : "pezzo");

export function OfferSheet() {
  const offer = useCurrent();
  const insets = useSafeAreaInsets();
  const { list, addToList, removeFromList } = useApp();
  const id = offer ? itemFromOffer(offer).id : "";
  const inList = list.some((item) => item.id === id);

  return (
    <Modal visible={offer !== null} transparent animationType="slide" onRequestClose={closeOffer} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={closeOffer} />
      {offer ? (
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grab} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <View style={styles.top}>
              <View style={styles.image}>
                {offer.imageUrl ? <Image source={{ uri: offer.imageUrl }} style={styles.imageFill} resizeMode="contain" resizeMethod="resize" /> : <Icon name="cart" size={36} color="#94a9c4" />}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name}>{offer.name}</Text>
                {offer.brand ? <Text style={styles.muted}>{offer.brand}</Text> : null}
                <View style={styles.chain}>
                  <ChainLogo chainId={offer.chainId} name={offer.chainName} size={20} />
                  <Text style={styles.chainText}>{offer.chainName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>{euro(offer.price)}</Text>
              {offer.originalPrice != null ? <Text style={styles.old}>{euro(offer.originalPrice)}</Text> : null}
              {offer.discountPercent != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{`-${Math.round(offer.discountPercent)}%`}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.facts}>
              {offer.packageText ? <Fact label="Confezione" value={offer.packageText} /> : null}
              {offer.unitPrice != null && offer.unit ? <Fact label={`Prezzo al ${unitName(offer.unit)}`} value={euro(offer.unitPrice)} /> : null}
              <Fact label="Valida" value={`${day(offer.validFrom)} – ${day(offer.validTo)}`} />
              {offer.requiresLoyaltyCard ? <Fact label="Richiede" value="carta fedeltà" /> : null}
            </View>

            {offer.description ? <Text style={styles.description}>{offer.description}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={[styles.primary, inList && styles.primaryOn]} onPress={() => (inList ? removeFromList(id) : addToList(itemFromOffer(offer)))}>
                <Icon name={inList ? "check" : "plus"} size={18} color={inList ? colors.primary : "#fff"} />
                <Text style={[styles.primaryText, inList && { color: colors.primary }]}>{inList ? "Nella lista" : "Aggiungi alla lista"}</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => void Linking.openURL(flyerUrl(offer.chainId, offer.sourceUrl)).catch(() => undefined)}>
                <Icon name="external" size={18} color={colors.primary} />
                <Text style={styles.secondaryText}>Volantino</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { maxHeight: "82%", backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10 },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 12 },
  top: { flexDirection: "row", gap: 14 },
  image: { width: 112, height: 112, borderRadius: radius.md, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imageFill: { width: "100%", height: "100%" },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  chain: { flexDirection: "row", alignItems: "center", gap: 6 },
  chainText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  price: { fontSize: 32, fontWeight: "800", color: colors.primary },
  old: { color: "#94a3b8", textDecorationLine: "line-through", fontSize: 16 },
  badge: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  facts: { borderRadius: radius.md, backgroundColor: colors.bg, padding: 12, gap: 8 },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  factLabel: { color: colors.muted, fontSize: 13 },
  factValue: { color: colors.text, fontWeight: "600", fontSize: 13, flexShrink: 1, textAlign: "right" },
  description: { color: "#475569", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  primary: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: radius.pill, backgroundColor: colors.primary },
  primaryOn: { backgroundColor: colors.primarySoft },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondary: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  secondaryText: { color: colors.primary, fontWeight: "700" },
});
