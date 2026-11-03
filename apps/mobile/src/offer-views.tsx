import { Image, StyleSheet, Text, View } from "react-native";
import type { OfferView } from "@salvaspesa/app-core";

export const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

function Thumb({ offer, size }: { offer: OfferView; size: number | "fill" }) {
  const style = size === "fill" ? styles.thumbFill : { width: size, height: size };
  return offer.imageUrl ? (
    <Image source={{ uri: offer.imageUrl }} style={[styles.thumb, style]} resizeMode="contain" />
  ) : (
    <View style={[styles.thumb, styles.noThumb, style]}>
      <Text style={{ fontSize: 28 }}>🛒</Text>
    </View>
  );
}

function Discount({ offer }: { offer: OfferView }) {
  return offer.discountPercent != null ? (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{`-${Math.round(offer.discountPercent)}%`}</Text>
    </View>
  ) : null;
}

export function OfferRow({ offer }: { offer: OfferView }) {
  return (
    <View style={styles.row}>
      <Thumb offer={offer} size={72} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>
          {offer.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {offer.chainName}
          {offer.packageText ? ` · ${offer.packageText}` : ""}
          {offer.requiresLoyaltyCard ? " · con carta" : ""}
        </Text>
        {offer.unitPrice != null && offer.unit && <Text style={styles.muted}>{`${euro(offer.unitPrice)}/${offer.unit}`}</Text>}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={styles.price}>{euro(offer.price)}</Text>
        {offer.originalPrice != null && <Text style={styles.old}>{euro(offer.originalPrice)}</Text>}
        <Discount offer={offer} />
      </View>
    </View>
  );
}

export function OfferTile({ offer, width }: { offer: OfferView; width?: number }) {
  return (
    <View style={[styles.tile, width ? { width } : { flex: 1 }]}>
      <View style={styles.tileImage}>
        <Thumb offer={offer} size="fill" />
        <View style={styles.tileBadge}>
          <Discount offer={offer} />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {offer.name}
      </Text>
      <Text style={styles.muted} numberOfLines={1}>
        {offer.chainName}
        {offer.packageText ? ` · ${offer.packageText}` : ""}
      </Text>
      <View style={styles.tilePrices}>
        <Text style={styles.price}>{euro(offer.price)}</Text>
        {offer.originalPrice != null && <Text style={styles.old}>{euro(offer.originalPrice)}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 8, backgroundColor: "#fff" },
  thumbFill: { width: "100%", height: "100%" },
  noThumb: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  tile: { margin: 6, padding: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", gap: 2 },
  tileImage: { aspectRatio: 1, marginBottom: 6 },
  tileBadge: { position: "absolute", top: 4, left: 4 },
  tilePrices: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  name: { fontWeight: "600", fontSize: 14 },
  muted: { color: "#64748b", fontSize: 12 },
  price: { fontWeight: "800", fontSize: 17, color: "#15803d" },
  old: { color: "#94a3b8", textDecorationLine: "line-through", fontSize: 12 },
  badge: { backgroundColor: "#dc2626", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
