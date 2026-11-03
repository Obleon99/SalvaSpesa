import { useMemo } from "react";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import { offerKey, type OfferView } from "@salvaspesa/app-core";
import { usePrepared } from "./offers";
import { useApp } from "./state";

// Un prodotto della lista: nasce da un'offerta (con il prezzo di quel momento) oppure da un testo libero.
export interface ListItem {
  id: string;
  name: string;
  qty: number;
  done: boolean;
  offerKey?: string;
  price?: number;
  chainId?: string;
  chainName?: string;
}

export const MAX_LIST_ITEMS = 100;

export const itemFromOffer = (offer: OfferView): ListItem => ({
  id: `o:${offerKey(offer)}`,
  name: offer.name,
  qty: 1,
  done: false,
  offerKey: offerKey(offer),
  price: offer.price,
  chainId: offer.chainId,
  chainName: offer.chainName,
});

export const itemFromText = (text: string): ListItem => ({ id: `t:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: text.trim().slice(0, 60), qty: 1, done: false });

export const itemTotal = (item: ListItem) => (item.price ?? 0) * item.qty;
export const listTotal = (items: ListItem[]) => Math.round(items.reduce((sum, item) => sum + itemTotal(item), 0) * 100) / 100;

// Le parole che descrivono il prodotto ("latte granarolo 1l" → latte + granarolo): servono a trovare offerte simili.
export function tokensOf(name: string): string[] {
  const words = normalizeText(name)
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !/\d/.test(word));
  return words.slice(0, 2);
}

export interface Match {
  item: ListItem;
  offers: OfferView[];
}

export interface ChainPlan {
  chainId: string;
  chainName: string;
  covered: number;
  total: number;
  cost: number;
}

const MATCHES_PER_ITEM = 3;

// Per ogni prodotto da comprare, le offerte più convenienti (prezzo al kg/litro quando c'è, altrimenti il prezzo).
export function useListMatches(): { matches: Match[]; plan: ChainPlan[] } {
  const { list } = useApp();
  const prepared = usePrepared();
  return useMemo(() => {
    const open = list.filter((item) => !item.done);
    const matches: Match[] = open.map((item) => {
      const tokens = tokensOf(item.name);
      if (tokens.length === 0) return { item, offers: [] };
      // Il cibo per animali compare solo se è proprio ciò che si cerca ("pollo" non deve portare alle crocchette).
      const wantsPet = classifyProduct({ name: item.name }).group === "animali";
      const found: OfferView[] = [];
      for (const p of prepared) if ((wantsPet || p.group !== "animali") && tokens.every((token) => p.text.includes(token))) found.push(p.offer);
      found.sort((a, b) => (a.unitPrice ?? a.price) - (b.unitPrice ?? b.price));
      return { item, offers: found.slice(0, MATCHES_PER_ITEM) };
    });

    // Dove conviene andare: per ogni insegna, quanti prodotti si trovano e quanto costa il più economico di ciascuno.
    const byChain = new Map<string, ChainPlan>();
    for (const { item, offers } of matches) {
      const cheapest = new Map<string, OfferView>();
      for (const offer of offers) if (!cheapest.has(offer.chainId)) cheapest.set(offer.chainId, offer);
      for (const [chainId, offer] of cheapest) {
        const plan = byChain.get(chainId) ?? { chainId, chainName: offer.chainName, covered: 0, total: open.length, cost: 0 };
        plan.covered += 1;
        plan.cost += offer.price * item.qty;
        byChain.set(chainId, plan);
      }
    }
    const plan = [...byChain.values()].sort((a, b) => b.covered - a.covered || a.cost - b.cost);
    return { matches, plan };
  }, [list, prepared]);
}
