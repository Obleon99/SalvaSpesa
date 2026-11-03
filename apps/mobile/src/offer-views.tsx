import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { OfferView } from "@salvaspesa/app-core";
import { ChainLogo } from "./chain-logo";
import { Icon } from "./icons";
import { colors, radius, shadow } from "./theme";

export const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

function Thumb({ offer, size }: { offer: OfferView; size: number | "fill" }) {
  const style = size === "fill" ? styles.thumbFill : { width: size, height: size };
  return offer.imageUrl ? (
    // `resize` riduce l'immagine prima di decodificarla: meno memoria sui telefoni datati.
    <Image source={{ uri: offer.imageUrl }} style={[styles.thumb, style]} resizeMode="contain" resizeMethod="resize" fadeDuration={80} />
  ) : (
    <View style={[styles.thumb, styles.noThumb, style]}>
      <Icon name="cart" size={26} color="#9db3a6" />
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

function ChainTag({ offer }: { offer: OfferView }) {
  return (
    <View style={styles.chain}>
      <ChainLogo chainId={offer.chainId} name={offer.chainName} size={16} />
      <Text style={styles.chainText} numberOfLines={1}>
        {offer.chainName}
      </Text>
    </View>
  );
}

export const OfferRow = memo(function OfferRow({ offer }: { offer: OfferView }) {
  return (
    <View style={styles.row}>
      <Thumb offer={offer} size={72} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={2}>
          {offer.name}
        </Text>
        <ChainTag offer={offer} />
        <Text style={styles.muted} numberOfLines={1}>
          {[offer.packageText, offer.requiresLoyaltyCard ? "con carta" : null, offer.unitPrice != null && offer.unit ? `${euro(offer.unitPrice)}/${offer.unit}` : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={styles.price}>{euro(offer.price)}</Text>
        {offer.originalPrice != null && <Text style={styles.old}>{euro(offer.originalPrice)}</Text>}
        <Discount offer={offer} />
      </View>
    </View>
  );
});

export const OfferTile = memo(function OfferTile({ offer, width }: { offer: OfferView; width?: number }) {
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
      <ChainTag offer={offer} />
      {offer.packageText ? (
        <Text style={styles.muted} numberOfLines={1}>
          {offer.packageText}
        </Text>
      ) : null}
      <View style={styles.tilePrices}>
        <Text style={styles.price}>{euro(offer.price)}</Text>
        {offer.originalPrice != null && <Text style={styles.old}>{euro(offer.originalPrice)}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.sm, backgroundColor: "#fff" },
  thumbFill: { width: "100%", height: "100%" },
  noThumb: { backgroundColor: "#eef3f0", alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginBottom: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.card, ...shadow },
  tile: { margin: 6, padding: 10, borderRadius: radius.md, backgroundColor: colors.card, gap: 3, ...shadow },
  tileImage: { aspectRatio: 1, marginBottom: 6 },
  tileBadge: { position: "absolute", top: 2, left: 2 },
  tilePrices: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  name: { fontWeight: "600", fontSize: 14, color: colors.text },
  muted: { color: colors.muted, fontSize: 12 },
  chain: { flexDirection: "row", alignItems: "center", gap: 5 },
  chainText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  price: { fontWeight: "800", fontSize: 18, color: colors.primary },
  old: { color: "#94a3b8", textDecorationLine: "line-through", fontSize: 12 },
  badge: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
