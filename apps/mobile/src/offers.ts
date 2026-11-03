import { useDeferredValue, useMemo } from "react";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import type { OfferView } from "@salvaspesa/app-core";
import { useApp } from "./state";

export interface Prepared {
  offer: OfferView;
  group: string;
  text: string;
}

// Categoria e testo normalizzato si calcolano una volta per set di offerte, non a ogni tasto premuto o cambio filtro.
const preparedCache = new WeakMap<OfferView[], Prepared[]>();

function prepare(offers: OfferView[]): Prepared[] {
  let prepared = preparedCache.get(offers);
  if (!prepared) {
    prepared = offers
      .map((offer) => ({ offer, group: classifyProduct(offer).group, text: normalizeText(`${offer.name} ${offer.brand ?? ""}`) }))
      .sort((a, b) => (b.offer.discountPercent ?? 0) - (a.offer.discountPercent ?? 0));
    preparedCache.set(offers, prepared);
  }
  return prepared;
}

// Tutte le offerte preparate (senza filtro per categorie): servono alla lista della spesa.
export function usePrepared(): Prepared[] {
  const { data } = useApp();
  return useMemo(() => prepare(data?.offers ?? []), [data]);
}

// Offerte dei supermercati preferiti, filtrate per categorie del profilo e per testo, dalle più scontate.
// La ricerca è "differita": mentre si scrive la tastiera resta fluida e la lista si aggiorna appena possibile.
export function useVisibleOffers(query = ""): OfferView[] {
  const { data, categories } = useApp();
  const deferred = useDeferredValue(query);
  const prepared = useMemo(() => prepare(data?.offers ?? []), [data]);
  return useMemo(() => {
    const term = normalizeText(deferred);
    const all = categories.length === 0 && !term;
    return prepared.filter((p) => all || ((categories.length === 0 || categories.includes(p.group)) && (!term || p.text.includes(term)))).map((p) => p.offer);
  }, [prepared, categories, deferred]);
}
