import * as cheerio from "cheerio";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, mapLimit, sleep } from "../http";
import { discountPercent, parseEuro, parseUnitPrice, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

// Spesa online di Conad: elenco prodotti con prezzo del negozio online predefinito (i prezzi dei singoli punti vendita possono differire).
const BASE = "https://spesaonline.conad.it";
const REQUEST_DELAY_MS = 400;
const MAX_PAGES_PER_CATEGORY = 40;
const CONCURRENCY = 3;
const CATALOG_DAYS = 7;

// Reparti che non servono al confronto della spesa alimentare e della casa.
const SKIP = /abbigliamento|cancelleria|tempo-libero|outdoor/;

interface Crawl {
  all: ScrapedOffer[];
  rejected: RejectedItem[];
  pages: string[];
}

let crawl: Promise<Crawl> | null = null;

async function subcategories(): Promise<{ slug: string; url: string }[]> {
  const home = await fetchText(BASE);
  const tops = new Set<string>();
  for (const match of home.matchAll(/href="(\/c\/[a-z0-9-]+--\d{2})"/g)) if (!SKIP.test(match[1])) tops.add(match[1]);

  const found = new Map<string, string>();
  for (const top of tops) {
    const code = top.slice(-2);
    await sleep(REQUEST_DELAY_MS);
    let subs: [string, string][] = [];
    try {
      const html = await fetchText(BASE + top);
      subs = [...html.matchAll(/href="(\/c\/([a-z0-9-]+)--(\d{4,}))"/g)].filter((m) => m[3].startsWith(code)).map((m) => [m[1], m[2]]);
    } catch {
      // se il reparto non si legge si prova comunque la sua pagina
    }
    // Senza sottocategorie la pagina del reparto è già l'elenco.
    if (subs.length === 0) subs = [[top, top.slice(3, -4)]];
    for (const [url, slug] of subs) found.set(url, slug);
  }
  return [...found].map(([url, slug]) => ({ slug: slug.replace(/-/g, " "), url: BASE + url }));
}

async function crawlSite(): Promise<Crawl> {
  const scrapedAt = new Date().toISOString();
  const validTo = new Date(Date.now() + CATALOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const all: ScrapedOffer[] = [];
  const rejected: RejectedItem[] = [];
  const pages: string[] = [];
  const seen = new Set<string>();

  const categories = await subcategories();
  await mapLimit(categories, CONCURRENCY, async (category) => {
    let previous = "";
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
      const cards = $(".card-middle");
      const signature = cards.map((_, e) => $(e).find("a.product").attr("href")).get().join("|");
      if (cards.length === 0 || signature === previous) break;
      previous = signature;

      cards.each((_, element) => {
        const card = $(element);
        const href = card.find("a.product").attr("href") ?? "";
        const externalId = href.match(/--(\d+)$/)?.[1] ?? "";
        if (!externalId || seen.has(externalId)) return;
        seen.add(externalId);

        const name = card.find(".product-description h3").text().replace(/\s+/g, " ").trim();
        const size = card.find(".product-quantity").first().text().replace(/\s+/g, " ").trim() || null;
        const price = parseEuro(card.find(".product-price").first().text().replace("€", " €"));
        const was = parseEuro(card.find(".product-price-old, .old-price, .prezzo-barrato, [class*=price-old], [class*=old-price]").first().text().replace("€", " €"));
        const originalPrice = price !== null && was !== null && was > price ? was : null;
        const unit =
          parseUnitPrice(card.find(".product-price-kg").first().text().replace(/\s+/g, " ").replace(/^\s*([\d.,]+)\s*€\s*\/\s*(\w+)/, "1 $2 $1 €")) ??
          (price !== null ? unitPriceFromPackage(price, size) : null);
        const img = card.find("img").first().attr("data-src") ?? card.find("img").first().attr("src") ?? null;

        collect(
          {
            chainId: "conad",
            externalId,
            sourceUrl: BASE + href,
            name,
            brand: /\bconad\b/i.test(name) ? "Conad" : null,
            description: null,
            imageUrl: img ? (img.startsWith("http") ? img : BASE + img) : null,
            category: category.slug,
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
  });
  return { all, rejected, pages };
}

const crawlOnce = () => (crawl ??= crawlSite());

export const conadAdapter: ChainAdapter = {
  chainId: "conad",
  chainName: "Conad",

  async scrape(): Promise<AdapterResult> {
    const { all, rejected, pages } = await crawlOnce();
    return { offers: all.filter((o) => o.originalPrice !== null), rejected, pages };
  },

  async scrapeCatalog(): Promise<AdapterResult> {
    const { all, rejected, pages } = await crawlOnce();
    return { offers: all, rejected, pages };
  },
};
