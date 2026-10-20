import type { HistoryPoint, OfferView } from "./offers-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Ignora i token che non descrivono il prodotto ("n.12" diventa "n" e "12").
function queryTokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((token) => token.length > 1 && !/^\d{1,2}$/.test(token));
}

const PET_FOOD = /\b(gatt[oi]|cane|cani|crocchett\w*|felix|purina|whiskas|kitekat|sheba|gourmet|pedigree|friskies|cesar|schesir|animonda|monge)\b/;

export function searchOffers(offers: OfferView[], query: string, now = Date.now()): OfferView[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const wantsPetFood = PET_FOOD.test(normalize(query));
  return offers.filter((offer) => {
    if (Date.parse(offer.validFrom) > now || Date.parse(offer.validTo) < now) return false;
    const haystack = normalize(`${offer.brand ?? ""} ${offer.name} ${offer.packageText ?? ""}`);
    if (!wantsPetFood && PET_FOOD.test(haystack)) return false;
    const compact = haystack.replace(/ /g, "");
    return tokens.every((token) => haystack.includes(token) || compact.includes(token));
  });
}

// Confronta sul prezzo al kg/l quando c'è, altrimenti sul prezzo di scaffale.
export const comparablePrice = (offer: OfferView): number => offer.unitPrice ?? offer.price;

export function rankOffers(offers: OfferView[]): OfferView[] {
  return [...offers].sort(
    (a, b) => comparablePrice(a) - comparablePrice(b) || (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
  );
}

export function bestPerChain(offers: OfferView[]): OfferView[] {
  const best = new Map<string, OfferView>();
  for (const offer of rankOffers(offers)) {
    if (!best.has(offer.chainId)) best.set(offer.chainId, offer);
  }
  return [...best.values()];
}

export function daysLeft(validTo: string, now = Date.now()): number {
  return Math.ceil((Date.parse(validTo) - now) / DAY_MS);
}

export function expiryLabel(validTo: string, now = Date.now()): string {
  const days = daysLeft(validTo, now);
  if (days <= 0) return "Scade oggi";
  if (days === 1) return "Scade domani";
  return `Scade tra ${days} giorni`;
}

export function formatPrice(value: number): string {
  return `${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function formatUnitPrice(offer: Pick<OfferView, "unitPrice" | "unit">): string | null {
  if (offer.unitPrice === null || offer.unit === null) return null;
  const unit = offer.unit === "pz" ? "pz" : offer.unit;
  return `${formatPrice(offer.unitPrice)}/${unit}`;
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

export function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export const suggestedAlertThreshold = (price: number): number => Math.max(0.05, Math.floor(price * 0.9 * 20) / 20);

export interface Sparkline {
  line: string;
  fill: string;
  last: { x: number; y: number };
}

const SPARK_W = 280;
const SPARK_H = 70;
const SPARK_PAD = 10;

export function buildSparkline(points: HistoryPoint[]): Sparkline | null {
  if (points.length < 2) return null;
  const times = points.map((p) => Date.parse(`${p.date}T12:00:00Z`));
  const prices = points.map((p) => p.price);
  const minT = times[0];
  const spanT = Math.max(times[times.length - 1] - minT, 1);
  const minP = Math.min(...prices);
  const spanP = Math.max(Math.max(...prices) - minP, 0.01);

  const coords = points.map((_, i) => ({
    x: Math.round(((times[i] - minT) / spanT) * SPARK_W * 10) / 10,
    y: Math.round((SPARK_PAD + (1 - (prices[i] - minP) / spanP) * (SPARK_H - SPARK_PAD * 2)) * 10) / 10,
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  return { line, fill: `${line} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`, last: coords[coords.length - 1] };
}
