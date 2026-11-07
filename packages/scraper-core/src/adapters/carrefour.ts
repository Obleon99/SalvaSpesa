import * as cheerio from "cheerio";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, endOfDayIso, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const BASE = "https://www.carrefour.it";
const PAGE_SIZE = 40;
const REQUEST_DELAY_MS = 400;
// Offerte: prima le promozioni (ordinamento per promo), ci si ferma alla prima pagina senza sconti.
const MAX_PROMO_PAGES = 16;
// Catalogo completo: tetto di sicurezza per reparto.
const MAX_CATALOG_PAGES = 30;
const DEFAULT_VALID_DAYS = 7;
const MIN_DISCOUNT = 25;
const MAX_OFFERS = 1200;

// Reparti non alimentari o non utili al confronto della spesa.
const SKIP = /giocattoli|lotteria|colletta|articoli-per-la-casa|stili-alimentari/;

interface Crawl {
  offers: ScrapedOffer[];
  rejected: RejectedItem[];
  pages: string[];
}

interface ProductJson {
  name?: string;
  id?: string;
  price?: string;
  brand?: string;
  category?: string;
  dimension52?: string;
}

interface PriceJson {
  sales?: { value?: number };
  list?: { value?: number };
}

interface PromoJson {
  name?: string;
  endDate?: string;
  calloutMsg?: string;
}

function parseJson<T>(text: string | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function departments(): Promise<{ slug: string; path: string }[]> {
  const html = await fetchText(`${BASE}/spesa-online.html`);
  const found = new Map<string, string>();
  for (const match of html.matchAll(/href="(?:https:\/\/www\.carrefour\.it)?(\/spesa-online\/([a-z0-9-]+)\/)(?:\?[^"]*)?"/g)) {
    if (!SKIP.test(match[2]) && !match[2].startsWith("prodotti-")) found.set(match[2], match[1]);
  }
  return [...found].map(([slug, path]) => ({ slug, path }));
}

// "08/11/2026" -> data ISO a fine giornata.
function endDate(text: string | undefined): string | null {
  const match = text?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? endOfDayIso(`${match[3]}-${match[2]}-${match[1]}`) : null;
}

function readTiles(html: string, slug: string, scrapedAt: string, offers: ScrapedOffer[], rejected: RejectedItem[], seen: Set<string>): { tiles: number; discounted: number } {
  const $ = cheerio.load(html);
  let tiles = 0;
  let discounted = 0;
  const defaultTo = new Date(Date.now() + DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();

  $("article.product[data-pid]").each((_, element) => {
    const tile = $(element);
    const externalId = tile.attr("data-pid") ?? "";
    if (!externalId) return;
    tiles++;
    const product = parseJson<ProductJson>(tile.attr("data-product-json")) ?? {};
    const prices = parseJson<PriceJson>(tile.attr("data-option-product-price"));
    const promo = parseJson<PromoJson>(tile.attr("data-option-product-promotion-info"));
    const sales = prices?.sales?.value ?? Number(product.price);
    const list = prices?.list?.value;
    const price = Number.isFinite(sales) && sales > 0 ? sales : null;
    const originalPrice = price !== null && list && list > price ? list : null;
    if (originalPrice !== null) discounted++;
    if (seen.has(externalId)) return;
    seen.add(externalId);

    const name = (product.name ?? tile.find(".tile-description").first().text()).replace(/\s+/g, " ").trim();
    const href = tile.find("a.tile-link-pdp").first().attr("href") ?? "";
    const img = tile.find("img.tile-image").first();
    // Le immagini sotto la piega sono caricate al volo: l'indirizzo sta in data-srcset invece che in srcset/src.
    const image = (img.attr("srcset") ?? img.attr("data-srcset") ?? img.attr("src") ?? "").split(/\s+\d+w/)[0].split(",")[0].trim();
    const packageText = product.dimension52 ? product.dimension52.replace(/\.0\b/, "") : null;
    const unit = price !== null ? (unitPriceFromPackage(price, packageText) ?? unitPriceFromPackage(price, name)) : null;
    const label = [promo?.name, promo?.calloutMsg].filter(Boolean).join(" - ");
    const promoOffer = originalPrice !== null;

    collect(
      {
        chainId: "carrefour",
        externalId,
        sourceUrl: href ? BASE + href : `${BASE}/spesa-online/`,
        name,
        brand: product.brand?.trim() || null,
        description: null,
        imageUrl: image ? new URL(image, BASE).toString() : null,
        category: (product.category ?? slug).replace(/[_-]+/g, " ").trim(),
        price,
        originalPrice,
        discountPercent: price !== null ? discountPercent(price, originalPrice) : null,
        requiresLoyaltyCard: /payback|carta|card/i.test(label + tile.find(".js-offers-label").text()),
        packageText,
        unitPrice: unit?.unitPrice ?? null,
        unit: unit?.unit ?? null,
        validFrom: scrapedAt,
        validTo: promoOffer ? (endDate(promo?.endDate) ?? endDate(tile.find(".pricebook-valid-date").text()) ?? defaultTo) : defaultTo,
        scrapedAt,
        promoLabel: promoOffer && label ? label : null,
        ean: /^\d{8,14}$/.test(externalId) ? externalId : null,
        channel: "online",
      },
      offers,
      rejected,
    );
  });
  return { tiles, discounted };
}

async function crawl(onlyPromo: boolean): Promise<Crawl> {
  const scrapedAt = new Date().toISOString();
  const offers: ScrapedOffer[] = [];
  const rejected: RejectedItem[] = [];
  const pages: string[] = [];
  const seen = new Set<string>();
  const maxPages = onlyPromo ? MAX_PROMO_PAGES : MAX_CATALOG_PAGES;

  for (const department of await departments()) {
    for (let page = 0; page < maxPages; page++) {
      const query = `${onlyPromo ? "srule=promo-rank&" : ""}start=${page * PAGE_SIZE}&sz=${PAGE_SIZE}`;
      const url = `${BASE}${department.path}?${query}`;
      pages.push(url);
      let html: string;
      try {
        html = await fetchText(url, { timeoutMs: 45000 });
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `${url}: ${(error as Error).message}` });
        break;
      }
      const { tiles, discounted } = readTiles(html, department.slug, scrapedAt, offers, rejected, seen);
      // Pagina vuota o incompleta: reparto finito. Nelle offerte, senza sconti in pagina quelli dopo non ce ne sono.
      if (tiles < PAGE_SIZE || (onlyPromo && discounted === 0)) break;
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return { offers, rejected, pages };
}

export const carrefourAdapter: ChainAdapter = {
  chainId: "carrefour",
  chainName: "Carrefour",

  // Offerte = prodotti con prezzo scontato nella spesa online.
  async scrape(): Promise<AdapterResult> {
    const result = await crawl(true);
    // Quasi tutto il sito è "in promo": per non riempire il telefono si tengono gli sconti più forti.
    const deals = result.offers
      .filter((o) => o.originalPrice !== null && (o.discountPercent ?? 0) >= MIN_DISCOUNT)
      .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
      .slice(0, MAX_OFFERS);
    return { ...result, offers: deals };
  },

  async scrapeCatalog(): Promise<AdapterResult> {
    return crawl(false);
  },
};
