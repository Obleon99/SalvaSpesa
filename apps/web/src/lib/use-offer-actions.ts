"use client";

import { useCallback } from "react";
import { offerKey, type OfferView } from "./offers-types";
import { useUserState, type CartItem } from "./user-state";
import { suggestedAlertThreshold } from "./offer-search";

type CartPayload = Omit<CartItem, "addedAt">;

// Azioni comuni su un'offerta (carrello, avviso, preferiti) e testo del punto vendita preferito.
export function useOfferActions() {
  const { favorites, cart, toggleCartItem, alerts, setAlert, removeAlert, savedProducts, toggleSavedProduct } = useUserState();

  const placeOf = useCallback(
    (offer: Pick<OfferView, "storeIds" | "chainName">): string | null => {
      const favorite = favorites.find((f) => offer.storeIds.includes(f.id));
      if (!favorite) return null;
      const sameAsChain = favorite.name.trim().toLowerCase() === offer.chainName.toLowerCase();
      return (sameAsChain ? favorite.address : favorite.name) || null;
    },
    [favorites],
  );

  const labelOf = useCallback(
    (offer: Pick<OfferView, "storeIds" | "chainName">): string => {
      const place = placeOf(offer);
      return place ? `${offer.chainName} • ${place}` : offer.chainName;
    },
    [placeOf],
  );

  const toCartPayload = useCallback(
    (offer: OfferView): CartPayload => ({
      key: offerKey(offer),
      chainId: offer.chainId,
      chainName: offer.chainName,
      storeName: placeOf(offer) ?? offer.chainName,
      name: offer.name,
      price: offer.price,
      unitPrice: offer.unitPrice,
      unit: offer.unit,
      imageUrl: offer.imageUrl,
      brand: offer.brand,
      packageText: offer.packageText,
      ean: offer.ean ?? null,
      originalPrice: offer.originalPrice,
      validTo: offer.validTo,
      quantity: 1,
    }),
    [placeOf],
  );

  return {
    placeOf,
    labelOf,
    inCart: (offer: OfferView) => cart.some((c) => c.key === offerKey(offer)),
    toggleCart: (offer: OfferView) => toggleCartItem(toCartPayload(offer)),
    alertFor: (offer: OfferView) => alerts.find((a) => a.key === offerKey(offer)),
    toggleAlert: (offer: OfferView) => {
      const key = offerKey(offer);
      if (alerts.some((a) => a.key === key)) removeAlert(key);
      else setAlert({ key, name: offer.name, chainName: offer.chainName, threshold: suggestedAlertThreshold(offer.price) });
    },
    isSaved: (offer: OfferView) => savedProducts.some((p) => p.key === offerKey(offer)),
    toggleSaved: (offer: OfferView) =>
      toggleSavedProduct({ key: offerKey(offer), name: offer.name, chainName: offer.chainName, price: offer.price, imageUrl: offer.imageUrl }),
  };
}
