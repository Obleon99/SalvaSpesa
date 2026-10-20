"use client";

import { useMemo } from "react";
import { daysLeft, expiryLabel, formatPrice } from "./offer-search";
import { offerKey } from "./offers-types";
import { useUserState } from "./user-state";

export interface AppNotification {
  id: string;
  kind: "alert" | "expiring";
  icon: string;
  title: string;
  detail: string;
  href: string;
}

// Avvisi prezzo scattati e offerte del carrello che stanno per scadere, ricavati dalle offerte attuali.
export function useNotifications() {
  const { alerts, cart, offers, seenNotifications, markNotificationsSeen } = useUserState();

  const items = useMemo(() => {
    const now = Date.now();
    const byKey = new Map(offers.map((offer) => [offerKey(offer), offer]));
    const list: AppNotification[] = [];

    for (const alert of alerts) {
      const offer = byKey.get(alert.key);
      if (!offer || Date.parse(offer.validTo) < now || offer.price > alert.threshold) continue;
      list.push({
        id: `alert:${alert.key}:${offer.price}`,
        kind: "alert",
        icon: "notifications_active",
        title: `Prezzo raggiunto: ${offer.name}`,
        detail: `Ora ${formatPrice(offer.price)} da ${offer.chainName} (soglia ${formatPrice(alert.threshold)})`,
        href: `/?q=${encodeURIComponent(offer.name)}#tracker`,
      });
    }

    for (const item of cart) {
      const live = byKey.get(item.key);
      const validTo = live?.validTo ?? item.validTo;
      if (!validTo || Date.parse(validTo) < now || daysLeft(validTo, now) > 2) continue;
      list.push({
        id: `exp:${item.key}:${validTo.slice(0, 10)}`,
        kind: "expiring",
        icon: "alarm",
        title: `Offerta in scadenza: ${item.name}`,
        detail: `${expiryLabel(validTo, now)} • ${item.chainName}`,
        href: "/carrello",
      });
    }
    return list;
  }, [alerts, cart, offers]);

  const unread = items.filter((item) => !seenNotifications.includes(item.id));
  return { items, unread, markAllSeen: () => markNotificationsSeen(items.map((item) => item.id)) };
}
