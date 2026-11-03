import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { offerKey } from "@salvaspesa/app-core";
import { ChainLogo } from "./chain-logo";
import { Icon } from "./icons";
import { listTotal, useListMatches } from "./list";
import { OfferTile, euro } from "./offer-views";
import { useApp } from "./state";
import { colors, radius, shadow } from "./theme";
import { Button, StateMessage } from "./ui";

// Sezione della Home: le migliori offerte per i prodotti della lista e le insegne dove conviene di più andare.
export function MyList() {
  const { list, profile } = useApp();
  const { matches, plan } = useListMatches();
  const open = list.filter((item) => !item.done);
  const offers = matches.flatMap((m) => m.offers.slice(0, 2));
  const unique = offers.filter((offer, index) => offers.findIndex((o) => offerKey(o) === offerKey(offer)) === index).slice(0, 10);
  const total = listTotal(list);
  const best = plan[0];
  const noMatch = matches.filter((m) => m.offers.length === 0).length;

  return (
    <View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>La mia lista</Text>
        <Pressable onPress={() => router.push("/lista")} hitSlop={8}>
          <Text style={styles.link}>{list.length > 0 ? "Apri ›" : "Crea ›"}</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <StateMessage
          icon="cart"
          title="Prepara la tua lista della spesa"
          text="Segna i prodotti che vuoi comprare: qui troverai le offerte migliori e dove conviene andare."
          action={<Button label="Crea la lista" onPress={() => router.push("/lista")} />}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{open.length}</Text>
              <Text style={styles.summaryLabel}>da comprare</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, profile.weeklyBudget != null && total > profile.weeklyBudget && { color: colors.danger }]}>{euro(total)}</Text>
              <Text style={styles.summaryLabel}>{profile.weeklyBudget != null ? `su ${euro(profile.weeklyBudget)}` : "stimati"}</Text>
            </View>
          </View>

          {best ? (
            <View style={styles.plan}>
              <Text style={styles.planTitle}>Dove conviene andare</Text>
              {plan.slice(0, 3).map((p, index) => (
                <View key={p.chainId} style={[styles.planRow, index === 0 && styles.planBest]}>
                  <ChainLogo chainId={p.chainId} name={p.chainName} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{p.chainName}</Text>
                    <Text style={styles.planMeta}>{`${p.covered} prodotti su ${p.total} in offerta`}</Text>
                  </View>
                  <Text style={styles.planCost}>{euro(p.cost)}</Text>
                  {index === 0 ? <Icon name="star" size={16} color={colors.primary} filled /> : null}
                </View>
              ))}
              <Text style={styles.planHint}>
                {plan.length === 1 || best.covered > (plan[1]?.covered ?? 0)
                  ? `Da ${best.chainName} trovi più prodotti della lista: conviene raggruppare lì la spesa.`
                  : "Più insegne coprono lo stesso numero di prodotti: scegli quella con il totale più basso."}
                {noMatch > 0 ? ` Per ${noMatch} ${noMatch === 1 ? "prodotto" : "prodotti"} non ci sono offerte al momento.` : ""}
              </Text>
            </View>
          ) : (
            <StateMessage icon="search" title="Nessuna offerta per la tua lista" text="Per ora nessun prodotto della lista è in offerta nei tuoi supermercati." />
          )}

          {unique.length > 0 && (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={unique}
              keyExtractor={offerKey}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={5}
              contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 4 }}
              renderItem={({ item }) => <OfferTile offer={item} width={164} />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 18, marginTop: 22, marginBottom: 6 },
  section: { fontWeight: "800", fontSize: 18, color: colors.text },
  link: { color: colors.primary, fontWeight: "700" },
  summary: { flexDirection: "row", gap: 10, marginHorizontal: 14, marginBottom: 10 },
  summaryItem: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, ...shadow },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  summaryLabel: { color: colors.muted, fontSize: 12 },
  plan: { marginHorizontal: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, gap: 8, ...shadow },
  planTitle: { fontWeight: "800", color: colors.text },
  planRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: radius.sm },
  planBest: { backgroundColor: colors.primarySoft },
  planName: { fontWeight: "700", color: colors.text },
  planMeta: { color: colors.muted, fontSize: 12 },
  planCost: { fontWeight: "800", color: colors.text },
  planHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
