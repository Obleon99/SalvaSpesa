import * as cheerio from "cheerio";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, parseEuro, parseUnitPrice, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const BASE = "https://www.aldi.it";
const REQUEST_DELAY_MS = 500;
const MAX_PAGES_PER_CATEGORY = 15;
const CATALOG_DAYS = 7;

// Reparti alimentari e di cura: abbigliamento, arredo e stagionali non servono al confronto della spesa.
const SKIP = /abbigliamento|tempo-libero|halloween|natale|^casa$/;

interface Crawl {
  all: ScrapedOffer[];
  rejected: RejectedItem[];
  pages: string[];
}

let crawl: Promise<Crawl> | null = null;

async function topCategories(): Promise<{ slug: string; url: string }[]> {
  const html = await fetchText(`${BASE}/prodotti`);
  const found = new Map<string, string>();
  for (const match of html.matchAll(/href="(\/prodotti\/([^"/]+)\/k\/\d+)"/g)) {
    if (!SKIP.test(match[2])) found.set(match[2], BASE + match[1]);
  }
  return [...found].map(([slug, url]) => ({ slug, url }));
}

const label = (slug: string) => slug.replace(/-/g, " ");

async function crawlSite(): Promise<Crawl> {
  const scrapedAt = new Date().toISOString();
  const validTo = new Date(Date.now() + CATALOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const all: ScrapedOffer[] = [];
  const rejected: RejectedItem[] = [];
  const pages: string[] = [];
  const seen = new Set<string>();

  for (const category of await topCategories()) {
    for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
      const url = page === 1 ? category.url : `${category.url}?page=${page}`;
      pages.push(url);
      let html: string;
      try {
        html = await fetchText(url);
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `${url}: ${(error as Error).message}` });
        break;
      }
      const $ = cheerio.load(html);
      const tiles = $(".product-tile");
      if (tiles.length === 0) break;

      tiles.each((_, element) => {
        const tile = $(element);
        const href = tile.find("a").first().attr("href") ?? "";
        const externalId = href.match(/-(\d{6,})$/)?.[1] ?? "";
        if (!externalId || seen.has(externalId)) return;
        seen.add(externalId);

        const badges = tile.find(".product-tile__badges").text();
        const baseName = tile.find(".product-tile__name").text().trim();
        if (/disponibile dal/i.test(badges)) {
          rejected.push({ externalId, name: baseName, reason: "non ancora disponibile" });
          return;
        }

        const brand = tile.find(".product-tile__brandname").text().trim() || null;
        const discounted = parseEuro(tile.find(".base-price__discounted").first().text());
        const regular = parseEuro(tile.find(".base-price__regular").first().text());
        const was = parseEuro(tile.find(".base-price__was-price").first().text());
        const price = discounted ?? regular;
        const originalPrice = price !== null && was !== null && was > price ? was : null;
        const size = tile.find(".product-tile__unit-of-measurement").text().replace(/\s+/g, " ").trim() || null;
        const comparison = tile.find(".product-tile__comparison-price").text().replace(/[()]/g, "").replace("/1 ", " ").replace(/\s+/g, " ").trim();
        const unit =
          parseUnitPrice(/\b(kg|l)\b/i.test(comparison) ? comparison.replace(/^(.*?)\s*(kg|l)\b.*$/i, "1 $2 $1") : null) ??
          (price !== null ? unitPriceFromPackage(price, size) : null);

        collect(
          {
            chainId: "aldi",
            externalId,
            sourceUrl: BASE + href,
            name: baseName && brand && !baseName.toUpperCase().includes(brand.toUpperCase()) ? `${brand} ${baseName}` : baseName,
            brand,
            description: null,
            imageUrl: tile.find("img").first().attr("src") ?? null,
            category: label(category.slug),
            price,
            originalPrice,
            discountPercent: price !== null ? discountPercent(price, originalPrice) : null,
            requiresLoyaltyCard: false,
            packageText: size,
            unitPrice: unit?.unitPrice ?? null,
            unit: unit?.unit ?? null,
            validFrom: scrapedAt,
            validTo,
            scrapedAt,
            channel: "online",
          },
          all,
          rejected,
        );
      });
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return { all, rejected, pages };
}

const crawlOnce = () => (crawl ??= crawlSite());

export const aldiAdapter: ChainAdapter = {
  chainId: "aldi",
  chainName: "Aldi",

  // Le offerte sono i prodotti con prezzo barrato; il resto è catalogo.
  async scrape(): Promise<AdapterResult> {
    const { all, rejected, pages } = await crawlOnce();
    return { offers: all.filter((o) => o.originalPrice !== null), rejected, pages };
  },

  async scrapeCatalog(): Promise<AdapterResult> {
    const { all, rejected, pages } = await crawlOnce();
    return { offers: all, rejected, pages };
  },
};
