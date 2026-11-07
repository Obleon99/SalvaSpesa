import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { classifyProduct, hasTerm, normalizeText, seasonalStatus, type GroupId, type Storage } from "@salvaspesa/deal-logic";
import type { ScrapedOffer } from "@salvaspesa/shared-types";
import { CHAIN_DISPLAY_NAMES, getOffersForFavorites, runScraper } from "./offers-server";
import type { FavoriteRef, OfferView } from "./offers-types";

const CATALOG_DIR = path.resolve(process.cwd(), "../../data/catalog");
const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 240;

// Insegne di cui riusciamo a leggere il listino prodotti (con prezzo) dal sito pubblico.
export const CATALOG_CHAINS = new Set(["tigros", "eurospin", "aldi", "conad", "carrefour"]);

export interface Seasonality {
  label: string;
  kind: "frutta" | "verdura";
  inSeason: boolean;
}

export interface CatalogHit extends OfferView {
  kind: "offerta" | "catalogo";
  group: GroupId;
  sub: string;
  storage: Storage | null;
  season: Seasonality | null;
}

export interface CatalogSource {
  chainId: string;
  chainName: string;
  status: "ok" | "unsupported";
  products: number;
  scrapedAt: string | null;
  note?: string;
}

export interface CatalogResponse {
  query: string;
  month: number;
  total: number;
  hits: CatalogHit[];
  groups: Record<string, number>;
  subs: Record<string, number>;
  storages: Record<string, number>;
  chains: Record<string, number>;
  sources: CatalogSource[];
}

export interface CatalogQuery {
  q: string;
  group?: string;
  groups?: string[];
  sub?: string;
  storage?: string;
  chain?: string;
}

interface CatalogFile {
  scrapedAt: string;
  offers: ScrapedOffer[];
}

const cache = new Map<string, { mtimeMs: number; file: CatalogFile }>();

async function readCatalog(chainId: string): Promise<CatalogFile | null> {
  const file = path.join(CATALOG_DIR, chainId, "latest.json");
  try {
    const { mtimeMs } = await stat(file);
    const cached = cache.get(chainId);
    if (cached && cached.mtimeMs === mtimeMs) return cached.file;
    const parsed = JSON.parse(await readFile(file, "utf8")) as CatalogFile;
    cache.set(chainId, { mtimeMs, file: parsed });
    return parsed;
  } catch {
    return null;
  }
}

// Il listino manca: lo scarico subito (la prima ricerca aspetta). Se è solo vecchio lo aggiorno in sottofondo.
async function ensureCatalog(chainId: string): Promise<CatalogFile | null> {
  let catalog = await readCatalog(chainId);
  if (!catalog) {
    if (await runScraper(chainId, [], true)) catalog = await readCatalog(chainId);
  } else if (Date.now() - Date.parse(catalog.scrapedAt) > CATALOG_MAX_AGE_MS) {
    void runScraper(chainId, [], true);
  }
  return catalog;
}

const classCache = new Map<string, ReturnType<typeof classifyProduct>>();

function classify(item: { chainId: string; externalId: string; name: string; brand: string | null; category: string | null; packageText: string | null }) {
  const key = `${item.chainId}:${item.externalId}`;
  let result = classCache.get(key);
  if (!result) {
    result = classifyProduct(item);
    if (classCache.size > 60000) classCache.clear();
    classCache.set(key, result);
  }
  return result;
}

const PET_FOOD = /\b(gatt[oi]|cane|cani|crocchett\w*|felix|purina|whiskas|kitekat|sheba|pedigree|friskies|cesar|schesir|animonda|monge)\b/;

function queryTokens(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((token) => token.length > 1 && !/^\d{1,2}$/.test(token));
}

const comparable = (hit: CatalogHit): number => hit.unitPrice ?? hit.price;

export async function searchCatalog(favorites: FavoriteRef[], query: CatalogQuery): Promise<CatalogResponse> {
  const now = Date.now();
  const month = new Date(now).getMonth() + 1;
  const tokens = queryTokens(query.q);
  const wantsPetFood = PET_FOOD.test(normalizeText(query.q)) || query.group === "animali";
  const chainIds = [...new Set(favorites.map((f) => f.chainId))];

  const offersResponse = await getOffersForFavorites(favorites);
  const sources: CatalogSource[] = [];
  const byKey = new Map<string, CatalogHit>();

  const addItem = (item: ScrapedOffer, view: Partial<OfferView> & { chainName: string }, kind: CatalogHit["kind"]) => {
    const key = `${item.chainId}:${item.externalId}`;
    const existing = byKey.get(key);
    // Se un prodotto è sia in offerta sia a listino resta l'offerta, che ha lo sconto e la scadenza.
    if (existing && (existing.kind === "offerta" || kind === "catalogo")) return;
    const cls = classify(item);
    const season = cls.group === "frutta-verdura" && cls.storage === "fresco" ? seasonalStatus(item.name, month) : null;
    byKey.set(key, {
      ...item,
      ...view,
      storeIds: view.storeIds ?? favorites.filter((f) => f.chainId === item.chainId).map((f) => f.id),
      kind,
      group: cls.group,
      sub: cls.sub,
      storage: cls.storage,
      season: season ? { label: season.label, kind: season.kind, inSeason: season.inSeason } : null,
    });
  };

  for (const offer of offersResponse.offers) {
    if (Date.parse(offer.validFrom) > now || Date.parse(offer.validTo) < now) continue;
    addItem(offer, { chainName: offer.chainName, storeIds: offer.storeIds }, "offerta");
  }

  for (const chainId of chainIds) {
    const chainName = CHAIN_DISPLAY_NAMES[chainId] ?? favorites.find((f) => f.chainId === chainId)?.chainName ?? chainId;
    if (!CATALOG_CHAINS.has(chainId)) {
      const hasOffers = offersResponse.offers.some((o) => o.chainId === chainId);
      sources.push({
        chainId,
        chainName,
        status: "unsupported",
        products: 0,
        scrapedAt: null,
        note: hasOffers ? "Solo le offerte del volantino: il listino completo non è pubblico" : "Non ancora disponibile: il sito non pubblica prodotti e prezzi leggibili",
      });
      continue;
    }
    const catalog = await ensureCatalog(chainId);
    if (!catalog) {
      sources.push({ chainId, chainName, status: "unsupported", products: 0, scrapedAt: null, note: "Listino non scaricabile in questo momento" });
      continue;
    }
    sources.push({ chainId, chainName, status: "ok", products: catalog.offers.length, scrapedAt: catalog.scrapedAt });
    for (const item of catalog.offers) addItem(item, { chainName }, "catalogo");
  }

  const matches: CatalogHit[] = [];
  for (const hit of byKey.values()) {
    if (tokens.length > 0) {
      const haystack = normalizeText(`${hit.brand ?? ""} ${hit.name} ${hit.packageText ?? ""} ${hit.category ?? ""}`);
      if (!wantsPetFood && hit.group === "animali") continue;
      const compact = haystack.replace(/ /g, "");
      if (!tokens.every((token) => hasTerm(haystack, token) || compact.includes(token))) continue;
    } else if (!query.group) {
      continue;
    }
    matches.push(hit);
  }

  const tally = (items: CatalogHit[], key: (hit: CatalogHit) => string | null): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const hit of items) {
      const id = key(hit);
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  };

  const wanted = query.groups ?? [];
  const preferred = wanted.length > 0 ? matches.filter((hit) => wanted.includes(hit.group)) : matches;
  const byChain = query.chain ? preferred.filter((hit) => hit.chainId === query.chain) : preferred;
  const byGroup = query.group ? byChain.filter((hit) => hit.group === query.group) : byChain;
  const bySub = query.sub ? byGroup.filter((hit) => hit.sub === query.sub) : byGroup;
  const filtered = query.storage ? bySub.filter((hit) => hit.storage === query.storage) : bySub;

  filtered.sort((a, b) => {
    // Frutta e verdura: prima quella di stagione nel mese corrente.
    const seasonRank = (hit: CatalogHit) => (hit.season?.inSeason ? 0 : hit.season ? 2 : 1);
    if (query.group === "frutta-verdura" || (!query.group && a.group === "frutta-verdura" && b.group === "frutta-verdura")) {
      const diff = seasonRank(a) - seasonRank(b);
      if (diff !== 0) return diff;
    }
    return (a.unitPrice === null ? 1 : 0) - (b.unitPrice === null ? 1 : 0) || comparable(a) - comparable(b);
  });

  return {
    query: query.q,
    month,
    total: filtered.length,
    hits: filtered.slice(0, MAX_RESULTS),
    groups: tally(byChain, (hit) => hit.group),
    subs: tally(byGroup, (hit) => hit.sub),
    storages: tally(bySub, (hit) => hit.storage),
    chains: tally(preferred, (hit) => hit.chainId),
    sources,
  };
}
