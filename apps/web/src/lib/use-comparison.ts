"use client";

import { useMemo } from "react";
import { buildComparisonGroups, classifyProduct, summarizeGroups, type ComparableOffer, type ComparisonGroup } from "@salvaspesa/deal-logic";
import { offerKey, type OfferView } from "./offers-types";
import { useUserState } from "./user-state";

export type CompareOffer = OfferView & ComparableOffer;
export type CompareGroup = ComparisonGroup<CompareOffer>;

// Offerte attive ora nei supermercati preferiti, pronte per il confronto.
export function useActiveOffers(): CompareOffer[] {
  const { offers, profile } = useUserState();
  const wanted = profile.categories;
  return useMemo(() => {
    const now = Date.now();
    return offers
      .filter((offer) => Date.parse(offer.validFrom) <= now && Date.parse(offer.validTo) >= now)
      .filter((offer) => wanted.length === 0 || wanted.includes(classifyProduct(offer).group))
      .map((offer) => ({ ...offer, id: offerKey(offer) }));
  }, [offers, wanted]);
}

export function useComparison() {
  const active = useActiveOffers();
  return useMemo(() => {
    const groups = buildComparisonGroups(active);
    return { active, groups, summary: summarizeGroups(groups) };
  }, [active]);
}
