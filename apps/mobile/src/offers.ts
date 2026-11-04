import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import type { OfferView } from "@salvaspesa/app-core";
import { useApp } from "./state";

export interface Prepared {
  offer: OfferView;
  group: string;
  text: string;
}

const NONE: OfferView[] = [];
const MEMO_LIMIT = 8000;

// Categoria e testo normalizzato di un prodotto si ricordano: dopo un aggiornamento si classificano solo le offerte nuove.
const memo = new Map<string, { group: string; text: string }>();
const done = new WeakMap<OfferView[], Prepared[]>();
const pending = new WeakMap<OfferView[], Promise<Prepared[]>>();

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Prepara le offerte a piccoli blocchi, cedendo il thread tra uno e l'altro: anche con migliaia di offerte nuove l'interfaccia non si blocca.
function prepareAsync(offers: OfferView[]): Promise<Prepared[]> {
  let promise = pending.get(offers);
  if (!promise) {
    promise = (async () => {
      if (memo.size > MEMO_LIMIT) memo.clear();
      const out: Prepared[] = [];
      for (let i = 0; i < offers.length; i += 150) {
        for (const offer of offers.slice(i, i + 150)) {
          const key = `${offer.chainId}|${offer.name}|${offer.brand ?? ""}`;
          let entry = memo.get(key);
          if (!entry) {
            entry = { group: classifyProduct(offer).group, text: normalizeText(`${offer.name} ${offer.brand ?? ""}`) };
            memo.set(key, entry);
          }
          out.push({ offer, group: entry.group, text: entry.text });
        }
        if (i + 150 < offers.length) await tick();
      }
      out.sort((a, b) => (b.offer.discountPercent ?? 0) - (a.offer.discountPercent ?? 0));
      done.set(offers, out);
      return out;
    })();
    pending.set(offers, promise);
  }
  return promise;
}

// Tutte le offerte preparate (senza filtro per categorie): servono alla lista della spesa.
// Finché la preparazione di un nuovo set non è finita restano a schermo quelle precedenti.
export function usePrepared(): Prepared[] {
  const { data } = useApp();
  const offers = data?.offers ?? NONE;
  const [prepared, setPrepared] = useState<Prepared[]>(() => done.get(offers) ?? []);
  useEffect(() => {
    let cancelled = false;
    void prepareAsync(offers).then((result) => {
      if (!cancelled) setPrepared(result);
    });
    return () => {
      cancelled = true;
    };
  }, [offers]);
  return prepared;
}

// Offerte dei supermercati preferiti, filtrate per categorie del profilo e per testo, dalle più scontate.
// La ricerca è "differita": mentre si scrive la tastiera resta fluida e la lista si aggiorna appena possibile.
export function useVisibleOffers(query = ""): OfferView[] {
  const { categories } = useApp();
  const deferred = useDeferredValue(query);
  const prepared = usePrepared();
  return useMemo(() => {
    const term = normalizeText(deferred);
    const all = categories.length === 0 && !term;
    const wantsPet = term ? classifyProduct({ name: term }).group === "animali" : false;
    return prepared
      .filter((p) => (p.group !== "animali" || wantsPet) && (all || ((categories.length === 0 || categories.includes(p.group)) && (!term || p.text.includes(term)))))
      .map((p) => p.offer);
  }, [prepared, categories, deferred]);
}
