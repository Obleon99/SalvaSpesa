import { useMemo } from "react";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import type { OfferView } from "@salvaspesa/app-core";
import { useApp } from "./state";

// Offerte dei supermercati preferiti, filtrate per categorie del profilo e per testo, dalle più scontate.
export function useVisibleOffers(query = ""): OfferView[] {
  const { data, categories } = useApp();
  return useMemo(() => {
    const term = normalizeText(query);
    return (data?.offers ?? [])
      .filter((offer) => {
        if (categories.length > 0 && !categories.includes(classifyProduct(offer).group)) return false;
        return term ? normalizeText(`${offer.name} ${offer.brand ?? ""}`).includes(term) : true;
      })
      .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
  }, [data, categories, query]);
}
