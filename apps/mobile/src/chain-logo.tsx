import { memo } from "react";
import { Image, Text, View } from "react-native";
import { LOGOS } from "./logos";
import { BRAND_BADGES, colors } from "./theme";

// Logo dell'insegna: immagine incorporata se disponibile, altrimenti un badge con il nome sul colore di marca.
export const ChainLogo = memo(function ChainLogo({ chainId, name, size = 20 }: { chainId: string; name: string; size?: number }) {
  const radius = Math.round(size * 0.24);
  const logo = LOGOS[chainId];
  if (logo) return <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="contain" />;
  const badge = BRAND_BADGES[chainId];
  return (
    <View style={{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center", backgroundColor: badge?.color ?? colors.muted, overflow: "hidden" }}>
      <Text numberOfLines={1} style={{ color: badge?.text ?? "#fff", fontSize: Math.max(7, size * 0.3), fontWeight: "800" }}>
        {badge?.label ?? name.slice(0, 2).toLowerCase()}
      </Text>
    </View>
  );
});
