import { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { offerKey } from "@salvaspesa/app-core";
import { Icon, type IconName } from "../icons";
import { MyList } from "../my-list";
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

// Messaggi tecnici dei volantini tradotti in frasi comprensibili.
function friendly(note: string): string {
  if (/pdf/i.test(note)) return "il volantino è in PDF e la lettura sul telefono arriverà in un prossimo aggiornamento.";
  if (/abort|timeout|network|fetch|HTTP/i.test(note)) return "sito non raggiungibile in questo momento, riprova più tardi.";
  return note;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export default function Home() {
  const insets = useSafeAreaInsets();
  const { profile, favorites, data, loading, updating, progress, needsUpdate, location, refresh } = useApp();
  const offers = useVisibleOffers();
  const best = useMemo(() => offers.filter((o) => o.discountPercent != null).slice(0, 10), [offers]);
  const chains = useMemo(() => new Set(offers.map((o) => o.chainName)).size, [offers]);
  const people = profile.adults + profile.children;
  const busy = loading || updating;
  // Motivi per cui un supermercato non ha dato offerte, mostrati solo quando serve capire cosa è andato storto.
  const problems = useMemo(() => [...new Set((data?.sources ?? []).filter((s) => s.status !== "ok" && s.note).map((s) => `${s.chainName}: ${friendly(s.note ?? "")}`))].slice(0, 4), [data]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroTitle}>{greeting(profile.name)}</Text>
        <Text style={styles.heroText}>Le offerte dei tuoi supermercati, scaricate direttamente sul telefono.</Text>
        <View style={styles.pill}>
          <Icon name={busy ? "refresh" : "checkCircle"} size={14} color="#fff" />
          <Text style={styles.pillText} numberOfLines={1}>
            {busy ? progress || "Preparo le offerte…" : data?.generatedAt ? `Aggiornate alle ${time(data.generatedAt)}` : "Nessun aggiornamento ancora"}
          </Text>
        </View>
        {needsUpdate && !busy && (
          <Pressable style={styles.update} onPress={() => void refresh(true)} accessibilityRole="button" accessibilityLabel="Aggiorna le offerte">
            <Icon name="refresh" size={16} color={colors.primary} />
            <Text style={styles.updateText}>Aggiornamento</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.stats}>
        <Stat icon="tag" value={String(offers.length)} label="offerte" />
        <Stat icon="store" value={String(chains)} label="insegne" />
        <Stat icon="star" value={String(favorites.length)} label="preferiti" />
      </View>

      <Card style={styles.info}>
        <InfoLine icon="pin" text={location ? location.label : "Posizione non impostata"} />
        <InfoLine icon="users" text={`${people === 1 ? "1 persona" : `${people} persone`} in famiglia`} />
        <InfoLine icon="wallet" text={profile.weeklyBudget != null ? `Soglia settimanale ${euro(profile.weeklyBudget)}` : "Nessuna soglia di spesa impostata"} />
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
          <StateMessage busy title="Sto scaricando le offerte" text={progress ? `${progress}\nCi vorrà un momento, solo la prima volta.` : "Ci vorrà un momento, solo la prima volta."} />
          <SkeletonTiles count={2} />
        </>
      ) : favorites.length === 0 ? (
        <StateMessage
          icon="map"
          title="Scegli i tuoi supermercati"
          text="Aggiungi i negozi vicino a te e qui vedrai le offerte migliori."
          action={<Button label="Apri la mappa" onPress={() => router.push("/zona")} />}
        />
      ) : (
        <StateMessage
          icon="cart"
          title="Ancora nessuna offerta"
          text={problems.length > 0 ? problems.join("\n") : "I volantini dei tuoi supermercati non sono ancora disponibili."}
          action={<Button label="Riprova" onPress={() => void refresh(true)} />}
        />
      )}

      <MyList />
    </ScrollView>
  );
}

function InfoLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={16} color={colors.muted} />
      <Text style={styles.infoLine} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  update: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: "#fff", borderRadius: 999, paddingVertical: 8, paddingLeft: 14, paddingRight: 10 },
  updateText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  badge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 13, lineHeight: 16 },
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 6 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroText: { color: "#dbeafe", fontSize: 14, lineHeight: 20 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, maxWidth: "100%", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 10, paddingHorizontal: 14, marginTop: -34 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.card, ...shadow },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  statLabel: { color: colors.muted, fontSize: 12 },
  info: { marginHorizontal: 14, marginTop: 14, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLine: { flex: 1, fontSize: 14, color: "#334155" },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 18, marginTop: 22, marginBottom: 6 },
  section: { fontWeight: "800", fontSize: 18, color: colors.text },
  link: { color: colors.primary, fontWeight: "700" },
});
