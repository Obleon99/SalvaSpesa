import { memo, useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import { ChainLogo } from "../chain-logo";
import { Icon } from "../icons";
import { itemFromOffer, itemFromText, itemTotal, listTotal, useListMatches, type ListItem } from "../list";
import { euro } from "../offer-views";
import { usePrepared } from "../offers";
import { useApp } from "../state";
import { colors, radius, shadow } from "../theme";
import { StateMessage } from "../ui";

const SUGGESTIONS = 5;

export default function Lista() {
  const { list, profile, addToList, updateListItem, removeFromList, clearDone } = useApp();
  const { matches } = useListMatches();
  const prepared = usePrepared();
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const total = listTotal(list);

  // Suggerimenti mentre si scrive: le offerte attive che contengono le parole digitate.
  const suggestions = useMemo(() => {
    const term = normalizeText(deferred);
    if (term.length < 2) return [];
    const words = term.split(/\s+/);
    const wantsPet = classifyProduct({ name: deferred }).group === "animali";
    const found = [];
    for (const p of prepared) {
      if ((wantsPet || p.group !== "animali") && words.every((w) => p.text.includes(w))) {
        found.push(p.offer);
        if (found.length >= 40) break;
      }
    }
    return found.sort((a, b) => a.price - b.price).slice(0, SUGGESTIONS);
  }, [deferred, prepared]);

  const bestFor = useMemo(() => new Map(matches.map((m) => [m.item.id, m.offers[0]])), [matches]);
  const doneCount = list.filter((item) => item.done).length;

  const addText = () => {
    if (text.trim().length < 2) return;
    addToList(itemFromText(text));
    setText("");
  };

  return (
    <View style={styles.screen}>
      <Budget total={total} budget={profile.weeklyBudget} count={list.length} />

      <View style={styles.addBox}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Aggiungi un prodotto (es. latte, pasta…)"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={addText}
          autoCorrect={false}
        />
        <Pressable style={[styles.addButton, text.trim().length < 2 && { opacity: 0.4 }]} onPress={addText} disabled={text.trim().length < 2}>
          <Icon name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((offer) => (
            <Pressable
              key={`${offer.chainId}:${offer.externalId}`}
              style={styles.suggestion}
              onPress={() => {
                addToList(itemFromOffer(offer));
                setText("");
              }}
            >
              <ChainLogo chainId={offer.chainId} name={offer.chainName} size={20} />
              <Text style={styles.suggestionName} numberOfLines={1}>
                {offer.name}
              </Text>
              <Text style={styles.suggestionPrice}>{euro(offer.price)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
        initialNumToRender={10}
        windowSize={7}
        renderItem={({ item }) => (
          <Row
            item={item}
            hint={item.price == null ? bestFor.get(item.id) : undefined}
            onChange={updateListItem}
            onRemove={removeFromList}
          />
        )}
        ListEmptyComponent={<StateMessage icon="cart" title="La lista è vuota" text="Scrivi un prodotto qui sopra oppure tocca un'offerta e scegli «Aggiungi alla lista»: vedrai subito quanto spendi." />}
        ListFooterComponent={
          doneCount > 0 ? (
            <Pressable style={styles.clear} onPress={clearDone}>
              <Icon name="trash" size={15} color={colors.muted} />
              <Text style={styles.clearText}>Togli i prodotti già presi ({doneCount})</Text>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}

// Barra di spesa in tempo reale rispetto alla soglia settimanale scelta nel Profilo.
function Budget({ total, budget, count }: { total: number; budget: number | null; count: number }) {
  const over = budget != null && total > budget;
  const ratio = budget ? Math.min(total / budget, 1) : 0;
  const warn = budget != null && !over && ratio >= 0.85;
  const tone = over ? colors.danger : warn ? "#d97706" : colors.primary;
  return (
    <View style={styles.budget}>
      <View style={styles.budgetTop}>
        <View>
          <Text style={styles.budgetLabel}>Totale stimato</Text>
          <Text style={[styles.budgetTotal, over && { color: colors.danger }]}>{euro(total)}</Text>
        </View>
        <Text style={styles.budgetOf}>{budget != null ? `su ${euro(budget)}` : `${count} prodotti`}</Text>
      </View>
      {budget != null ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(ratio * 100, total > 0 ? 3 : 0)}%`, backgroundColor: tone }]} />
          </View>
          <View style={styles.budgetNote}>
            <Icon name={over ? "alert" : "checkCircle"} size={14} color={tone} />
            <Text style={[styles.noteText, { color: tone }]}>
              {over ? `Hai sforato di ${euro(total - budget)}` : warn ? `Quasi al limite: restano ${euro(budget - total)}` : `Ti restano ${euro(budget - total)}`}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.noteMuted}>Imposta la soglia di spesa nel Profilo per vedere quando la superi.</Text>
      )}
    </View>
  );
}

const Row = memo(function Row({ item, hint, onChange, onRemove }: { item: ListItem; hint?: { price: number; chainId: string; chainName: string; name: string }; onChange: (id: string, patch: Partial<ListItem>) => void; onRemove: (id: string) => void }) {
  return (
    <View style={[styles.row, item.done && { opacity: 0.55 }]}>
      <Pressable onPress={() => onChange(item.id, { done: !item.done })} hitSlop={8} style={[styles.check, item.done && styles.checkOn]}>
        {item.done ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.name, item.done && { textDecorationLine: "line-through" }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.chainId ? (
          <View style={styles.chain}>
            <ChainLogo chainId={item.chainId} name={item.chainName ?? ""} size={14} />
            <Text style={styles.chainText}>{item.chainName}</Text>
          </View>
        ) : hint ? (
          <Pressable style={styles.hint} onPress={() => onChange(item.id, { price: hint.price, chainId: hint.chainId, chainName: hint.chainName })}>
            <ChainLogo chainId={hint.chainId} name={hint.chainName} size={14} />
            <Text style={styles.hintText} numberOfLines={1}>{`Da ${euro(hint.price)} · ${hint.chainName} — usa questo prezzo`}</Text>
          </Pressable>
        ) : (
          <Text style={styles.chainText}>Nessuna offerta trovata per ora</Text>
        )}
      </View>
      <View style={styles.qty}>
        <Pressable onPress={() => onChange(item.id, { qty: Math.max(1, item.qty - 1) })} hitSlop={6} style={styles.qtyButton}>
          <Icon name="minus" size={14} color={colors.primary} />
        </Pressable>
        <Text style={styles.qtyText}>{item.qty}</Text>
        <Pressable onPress={() => onChange(item.id, { qty: Math.min(20, item.qty + 1) })} hitSlop={6} style={styles.qtyButton}>
          <Icon name="plus" size={14} color={colors.primary} />
        </Pressable>
      </View>
      <View style={{ alignItems: "flex-end", minWidth: 58 }}>
        <Text style={styles.price}>{item.price != null ? euro(itemTotal(item)) : "—"}</Text>
        <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
          <Icon name="trash" size={16} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  budget: { margin: 14, marginBottom: 8, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, gap: 8, ...shadow },
  budgetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  budgetLabel: { color: colors.muted, fontSize: 12 },
  budgetTotal: { fontSize: 28, fontWeight: "800", color: colors.text },
  budgetOf: { color: colors.muted, fontWeight: "600", marginBottom: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  budgetNote: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteText: { fontWeight: "700", fontSize: 13 },
  noteMuted: { color: colors.muted, fontSize: 12 },
  addBox: { flexDirection: "row", gap: 8, marginHorizontal: 14, marginBottom: 6 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.card, color: colors.text, fontSize: 15, ...shadow },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  suggestions: { marginHorizontal: 14, marginBottom: 6, borderRadius: radius.md, backgroundColor: colors.card, overflow: "hidden", ...shadow },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  suggestionName: { flex: 1, color: colors.text, fontSize: 14 },
  suggestionPrice: { color: colors.primary, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, ...shadow },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#94a9c4", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { fontWeight: "600", fontSize: 14, color: colors.text },
  chain: { flexDirection: "row", alignItems: "center", gap: 5 },
  chainText: { color: colors.muted, fontSize: 12 },
  hint: { flexDirection: "row", alignItems: "center", gap: 5 },
  hintText: { color: colors.primary, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  qty: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  qtyText: { minWidth: 14, textAlign: "center", fontWeight: "700", color: colors.text },
  price: { fontWeight: "800", color: colors.text, marginBottom: 4 },
  clear: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
  clearText: { color: colors.muted, fontWeight: "600" },
});
