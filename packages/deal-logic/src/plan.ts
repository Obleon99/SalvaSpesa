import type { ComparableOffer } from "./compare";
import { parseQuantity, words } from "./text";

const STOPWORDS = new Set([
  "di", "del", "della", "dei", "delle", "con", "e", "al", "alla", "alle", "in", "per", "tipo", "tipi", "diversi", "il", "la", "lo",
  "gr", "g", "kg", "ml", "l", "lt", "cl", "pz", "x", "conf", "confezione", "da", "a", "senza", "gusti", "gusto",
]);

function nameTokens(offer: Pick<ComparableOffer, "brand" | "name">): Set<string> {
  return new Set(
    words(`${offer.brand ?? ""} ${offer.name}`).filter((word) => word.length > 1 && !STOPWORDS.has(word) && !/^\d+$/.test(word) && !/^\d+(g|kg|ml|l|cl)$/.test(word)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / (a.size + b.size - shared);
}

type Identity = Pick<ComparableOffer, "brand" | "name" | "packageText" | "ean">;

// Stesso prodotto: stesso EAN, oppure nome molto simile e stessa quantità (tolleranza 15%).
export function areEquivalent(a: Identity, b: Identity): boolean {
  if (a.ean && b.ean && a.ean === b.ean) return true;
  if (jaccard(nameTokens(a), nameTokens(b)) < 0.6) return false;
  const qa = parseQuantity(a.packageText, a.name);
  const qb = parseQuantity(b.packageText, b.name);
  if (!qa || !qb) return true;
  if (qa.unit !== qb.unit) return false;
  return Math.abs(qa.value - qb.value) / Math.max(qa.value, qb.value) <= 0.15;
}

export interface BasketLine extends Identity {
  key: string;
  chainId: string;
  price: number;
}

export interface PlanAssignment {
  lineKey: string;
  chainId: string;
  chainName: string;
  offerId: string;
  price: number;
}

export interface BasketPlan {
  stores: number;
  chainIds: string[];
  chainNames: string[];
  total: number;
  covered: number;
  lines: number;
  baselineCovered: number;
  savings: number;
  assignments: PlanAssignment[];
}

export interface BasketPlans {
  baseline: number;
  plans: BasketPlan[];
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, size - 1).map((combo) => [first, ...combo]), ...combinations(rest, size)];
}

// Per ogni articolo si cercano gli equivalenti nelle offerte; poi si prova ogni gruppo di 1, 2 o 3 negozi.
export function planBasket<T extends ComparableOffer>(lines: BasketLine[], offers: T[], maxStores = 3): BasketPlans {
  const baseline = Math.round(lines.reduce((sum, line) => sum + line.price, 0) * 100) / 100;
  const options = new Map<string, Map<string, T>>();
  const chains = new Map<string, string>();

  for (const line of lines) {
    const byChain = new Map<string, T>();
    for (const offer of offers) {
      if (!areEquivalent(line, offer)) continue;
      const current = byChain.get(offer.chainId);
      if (!current || offer.price < current.price) byChain.set(offer.chainId, offer);
      chains.set(offer.chainId, offer.chainName);
    }
    options.set(line.key, byChain);
  }

  const plans: BasketPlan[] = [];
  const chainIds = [...chains.keys()];
  for (let size = 1; size <= Math.min(maxStores, chainIds.length); size++) {
    let best: BasketPlan | null = null;
    for (const combo of combinations(chainIds, size)) {
      const assignments: PlanAssignment[] = [];
      let baselineCovered = 0;
      for (const line of lines) {
        const candidates = combo.map((chainId) => options.get(line.key)?.get(chainId)).filter((offer): offer is T => Boolean(offer));
        if (candidates.length === 0) continue;
        const cheapest = candidates.reduce((a, b) => (b.price < a.price ? b : a));
        assignments.push({ lineKey: line.key, chainId: cheapest.chainId, chainName: cheapest.chainName, offerId: cheapest.id, price: cheapest.price });
        baselineCovered += line.price;
      }
      const total = Math.round(assignments.reduce((sum, a) => sum + a.price, 0) * 100) / 100;
      const candidate: BasketPlan = {
        stores: size,
        chainIds: combo,
        chainNames: combo.map((id) => chains.get(id) ?? id),
        total,
        covered: assignments.length,
        lines: lines.length,
        baselineCovered: Math.round(baselineCovered * 100) / 100,
        savings: Math.round((baselineCovered - total) * 100) / 100,
        assignments,
      };
      if (!best || candidate.covered > best.covered || (candidate.covered === best.covered && candidate.total < best.total)) best = candidate;
    }
    if (best) plans.push(best);
  }
  return { baseline, plans };
}
