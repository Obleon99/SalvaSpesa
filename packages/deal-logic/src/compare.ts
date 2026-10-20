import { classifyBrand, qualityLabels, type BrandTier } from "./brands";
import { FAMILIES, type FamilyDef } from "./families";
import { hasTerm, normalizeText, parseQuantity } from "./text";
import { median } from "./stats";

export interface ComparableOffer {
  id: string;
  chainId: string;
  chainName: string;
  name: string;
  brand: string | null;
  packageText: string | null;
  description?: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  unitPrice: number | null;
  unit: "kg" | "l" | "pz" | null;
  ean?: string | null;
}

export type Tier = "leader" | "winner" | "discount";

export interface ScoredOffer<T extends ComparableOffer = ComparableOffer> {
  offer: T;
  brandTier: BrandTier;
  brandLabel: string | null;
  unitPrice: number;
  quantity: number | null;
  badges: string[];
  score: number;
}

export interface ComparisonCard<T extends ComparableOffer = ComparableOffer> {
  tier: Tier;
  scored: ScoredOffer<T>;
  savingsPercent: number | null;
  savingsAmount: number | null;
}

export interface ComparisonGroup<T extends ComparableOffer = ComparableOffer> {
  family: FamilyDef;
  offers: ScoredOffer<T>[];
  cards: ComparisonCard<T>[];
  bestByChain: ScoredOffer<T>[];
  referenceLabel: string | null;
  recommendation: string | null;
  potentialSavingsPercent: number | null;
}

const OUTLIER_FACTOR = 6;

export function assignFamily(offer: Pick<ComparableOffer, "brand" | "name">, families: FamilyDef[] = FAMILIES): FamilyDef | null {
  const haystack = normalizeText(`${offer.brand ?? ""} ${offer.name}`);
  for (const family of families) {
    if (family.exclude?.some((term) => hasTerm(haystack, term))) continue;
    if (family.include.some((group) => group.every((term) => hasTerm(haystack, term)))) return family;
  }
  return null;
}

function resolveUnitPrice(offer: ComparableOffer, unit: "kg" | "l"): { unitPrice: number; quantity: number | null } | null {
  const quantity = parseQuantity(offer.packageText, offer.name);
  const sameUnitQuantity = quantity && quantity.unit === unit ? quantity.value : null;
  if (offer.unit === unit && offer.unitPrice) return { unitPrice: offer.unitPrice, quantity: sameUnitQuantity };
  if (sameUnitQuantity) return { unitPrice: Math.round((offer.price / sameUnitQuantity) * 100) / 100, quantity: sameUnitQuantity };
  return null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function scoreOffers<T extends ComparableOffer>(entries: Omit<ScoredOffer<T>, "score">[]): ScoredOffer<T>[] {
  const prices = entries.map((entry) => entry.unitPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return entries.map((entry) => {
    const priceScore = max === min ? 0.5 : (max - entry.unitPrice) / (max - min);
    const discountScore = Math.min(entry.offer.discountPercent ?? 0, 50) / 50;
    const qualityScore = Math.min(entry.badges.length, 3) / 3;
    return { ...entry, score: round1(10 * (0.6 * priceScore + 0.2 * discountScore + 0.2 * qualityScore)) };
  });
}

const titleCase = (text: string) => text.toLowerCase().replace(/(^|[\s'’/-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());

// Il campo marca di alcune insegne contiene la descrizione del prodotto: per le "altre marche" si usa il nome breve.
export function offerLabel<T extends ComparableOffer>(entry: ScoredOffer<T>): string {
  if (entry.brandTier === "leader") return entry.brandLabel ?? entry.offer.chainName;
  if (entry.brandTier === "private-label") {
    const brand = entry.brandLabel && normalizeText(entry.brandLabel) !== normalizeText(entry.offer.chainName) ? titleCase(entry.brandLabel) : null;
    return brand ? `${entry.offer.chainName} (${brand})` : entry.offer.chainName;
  }
  return `${titleCase(entry.offer.name.split(/\s+/).slice(0, 4).join(" "))} · ${entry.offer.chainName}`;
}

function buildGroup<T extends ComparableOffer>(family: FamilyDef, offers: T[]): ComparisonGroup<T> | null {
  const resolved = offers.flatMap((offer) => {
    const price = resolveUnitPrice(offer, family.unit);
    if (!price) return [];
    const brand = classifyBrand(offer.chainId, offer.brand, offer.name);
    return [{ offer, brandTier: brand.tier, brandLabel: brand.label, unitPrice: price.unitPrice, quantity: price.quantity, badges: qualityLabels(offer.name, offer.description, offer.brand) }];
  });
  if (resolved.length < 2) return null;

  const mid = median(resolved.map((entry) => entry.unitPrice));
  const plausible = resolved.filter((entry) => entry.unitPrice <= mid * OUTLIER_FACTOR && entry.unitPrice >= mid / OUTLIER_FACTOR);
  if (plausible.length < 2) return null;

  const scored = scoreOffers(plausible).sort((a, b) => a.unitPrice - b.unitPrice || b.score - a.score);

  // Marca leader di riferimento: la più economica tra le marche note. Le alternative contano solo se costano meno.
  const leader = scored.find((entry) => entry.brandTier === "leader") ?? null;
  const cheaper = scored.filter((entry) => entry !== leader && (!leader || entry.unitPrice < leader.unitPrice));
  const byScore = (a: ScoredOffer<T>, b: ScoredOffer<T>) => b.score - a.score || a.unitPrice - b.unitPrice;
  const winner = leader ? (cheaper.slice(1).sort(byScore)[0] ?? null) : (scored.slice().sort(byScore)[0] ?? null);
  const discountCard = leader ? (cheaper[0] ?? null) : (scored.find((entry) => entry !== winner) ?? null);

  const reference = leader ?? { unitPrice: mid, quantity: null as number | null };
  const toCard = (tier: Tier, entry: ScoredOffer<T>): ComparisonCard<T> => {
    const pct = reference.unitPrice > 0 ? Math.round((1 - entry.unitPrice / reference.unitPrice) * 100) : null;
    const amount = leader && leader.quantity && entry !== leader ? Math.round((leader.unitPrice - entry.unitPrice) * leader.quantity * 100) / 100 : null;
    return { tier, scored: entry, savingsPercent: entry === leader ? null : pct, savingsAmount: amount !== null && amount > 0 ? amount : null };
  };

  const cards: ComparisonCard<T>[] = [];
  if (leader) cards.push(toCard("leader", leader));
  if (winner) cards.push(toCard("winner", winner));
  if (discountCard && discountCard !== winner) cards.push(toCard("discount", discountCard));

  const bestByChain = new Map<string, ScoredOffer<T>>();
  for (const entry of scored) if (!bestByChain.has(entry.offer.chainId)) bestByChain.set(entry.offer.chainId, entry);

  const winnerCard = cards.find((card) => card.tier === "winner");
  const savingCards = cards.filter((card) => card.tier !== "leader" && (card.savingsPercent ?? 0) > 0);
  const best = savingCards.slice().sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))[0];
  const target = winnerCard && (winnerCard.savingsPercent ?? 0) > 0 ? winnerCard : best;
  const potential = leader && best ? (best.savingsPercent ?? null) : null;
  let recommendation: string | null = null;
  if (leader && target && target.savingsPercent) {
    const extras = target.scored.badges.length > 0 ? ` e ha ${target.scored.badges.slice(0, 3).join(", ")}` : "";
    recommendation = `${offerLabel(target.scored)} costa il ${target.savingsPercent}% in meno di ${offerLabel(leader)} (prezzo al ${family.unit})${extras}.`;
  }

  return {
    family,
    offers: scored,
    cards,
    bestByChain: [...bestByChain.values()],
    referenceLabel: leader ? offerLabel(leader) : null,
    recommendation,
    potentialSavingsPercent: potential,
  };
}

export function buildComparisonGroups<T extends ComparableOffer>(offers: T[], families: FamilyDef[] = FAMILIES): ComparisonGroup<T>[] {
  const byFamily = new Map<string, T[]>();
  for (const offer of offers) {
    const family = assignFamily(offer, families);
    if (family) byFamily.set(family.id, [...(byFamily.get(family.id) ?? []), offer]);
  }
  const groups: ComparisonGroup<T>[] = [];
  for (const family of families) {
    const group = buildGroup(family, byFamily.get(family.id) ?? []);
    if (group) groups.push(group);
  }
  return groups.sort((a, b) => (b.potentialSavingsPercent ?? 0) - (a.potentialSavingsPercent ?? 0) || b.offers.length - a.offers.length);
}

export interface ComparisonSummary {
  groups: number;
  comparedOffers: number;
  groupsWithLeader: number;
  averageSavingsPercent: number | null;
  best: { familyTitle: string; savingsPercent: number } | null;
}

export function summarizeGroups<T extends ComparableOffer>(groups: ComparisonGroup<T>[]): ComparisonSummary {
  const savings = groups.filter((g) => g.potentialSavingsPercent !== null);
  const best = savings.slice().sort((a, b) => (b.potentialSavingsPercent ?? 0) - (a.potentialSavingsPercent ?? 0))[0];
  return {
    groups: groups.length,
    comparedOffers: groups.reduce((sum, g) => sum + g.offers.length, 0),
    groupsWithLeader: groups.filter((g) => g.cards.some((c) => c.tier === "leader")).length,
    averageSavingsPercent: savings.length ? Math.round(savings.reduce((s, g) => s + (g.potentialSavingsPercent ?? 0), 0) / savings.length) : null,
    best: best ? { familyTitle: best.family.title, savingsPercent: best.potentialSavingsPercent ?? 0 } : null,
  };
}
