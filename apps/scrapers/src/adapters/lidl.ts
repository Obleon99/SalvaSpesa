import * as cheerio from "cheerio";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, extractBrand, htmlToText, parseUnitPrice, unitPriceFromPackage, unixToIso } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const BASE = "https://www.lidl.it";
const ENTRY_PAGES = [`${BASE}/`, `${BASE}/c/volantino-lidl/s10018048`];
const OFFER_LINK = /href="(\/c\/[^"#?]*(?:offert|volantin|-kw-\d+-\d+)[^"#?]*\/[a-z]\d+)"/gi;
const REQUEST_DELAY_MS = 500;

interface LidlDiscount {
  deletedPrice?: number;
  percentageDiscount?: number;
}

interface LidlPrice {
  price?: number;
  oldPrice?: number;
  endDate?: string;
  discount?: LidlDiscount;
  basePrice?: { text?: string };
  packaging?: { text?: string };
}

interface LidlRegion {
  currentPrice?: LidlPrice;
  currentLidlPlusPrice?: { price?: LidlPrice };
}

interface LidlProduct {
  productId?: number | string;
  title?: string;
  fullTitle?: string;
  canonicalUrl?: string;
  image?: string;
  imageList?: string[];
  price?: LidlPrice;
  regionsPrices?: Record<string, LidlRegion>;
  keyfacts?: { description?: string; wonCategoryPrimary?: string };
  storeStartDate?: number;
  storeEndDate?: number;
}

async function discoverOfferPages(): Promise<string[]> {
  const found = new Set<string>();
  for (const entry of ENTRY_PAGES) {
    try {
      const html = await fetchText(entry);
      for (const match of html.matchAll(OFFER_LINK)) found.add(BASE + match[1]);
      await sleep(REQUEST_DELAY_MS);
    } catch {
      // una pagina di ingresso irraggiungibile non blocca le altre
    }
  }
  return [...found];
}

function categoryOf(path: string | undefined): string | null {
  if (!path) return null;
  const segments = path.split("/").slice(2);
  return segments.length > 0 ? segments.join(" / ") : null;
}

function toCandidate(product: LidlProduct, scrapedAt: string) {
  const region = Object.values(product.regionsPrices ?? {})[0];
  const regular = product.price?.price !== undefined ? product.price : region?.currentPrice;
  const plus = region?.currentLidlPlusPrice?.price;
  const hasPlusPrice = plus?.price !== undefined;
  const effective = hasPlusPrice ? plus : regular;

  const price = effective?.price;
  const discount = effective?.discount;
  const originalPrice = effective?.oldPrice ?? discount?.deletedPrice ?? (hasPlusPrice ? (regular?.price ?? null) : null);
  const packageText = effective?.packaging?.text ?? regular?.packaging?.text ?? null;
  const unit =
    parseUnitPrice(effective?.basePrice?.text ?? regular?.basePrice?.text) ??
    (price ? unitPriceFromPackage(price, packageText) : null);
  const title = (product.fullTitle ?? product.title ?? "").trim();
  const validTo = product.storeEndDate
    ? unixToIso(product.storeEndDate)
    : (effective?.endDate ?? region?.currentPrice?.endDate ?? plus?.endDate);

  return {
    chainId: "lidl",
    externalId: String(product.productId ?? ""),
    sourceUrl: product.canonicalUrl ? BASE + product.canonicalUrl : "",
    name: title,
    brand: extractBrand(title),
    description: htmlToText(product.keyfacts?.description),
    imageUrl: product.image ?? product.imageList?.[0] ?? null,
    category: categoryOf(product.keyfacts?.wonCategoryPrimary),
    price,
    originalPrice,
    discountPercent: discount?.percentageDiscount ?? (price ? discountPercent(price, originalPrice) : null),
    requiresLoyaltyCard: hasPlusPrice,
    packageText,
    unitPrice: unit?.unitPrice ?? null,
    unit: unit?.unit ?? null,
    validFrom: product.storeStartDate ? unixToIso(product.storeStartDate) : scrapedAt,
    validTo,
    scrapedAt,
  };
}

export const lidlAdapter: ChainAdapter = {
  chainId: "lidl",
  chainName: "Lidl",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers: ScrapedOffer[] = [];
    const rejected: RejectedItem[] = [];
    const seen = new Set<string>();
    const pages = await discoverOfferPages();
    const now = Date.now();

    for (const page of pages) {
      let html: string;
      try {
        html = await fetchText(page);
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `pagina non scaricata ${page}: ${(error as Error).message}` });
        continue;
      }

      const $ = cheerio.load(html);
      $("[data-grid-data]").each((_, element) => {
        let product: LidlProduct;
        try {
          product = JSON.parse($(element).attr("data-grid-data") ?? "") as LidlProduct;
        } catch {
          return;
        }
        if (!product.productId || !(product.fullTitle ?? product.title)) return;

        const id = String(product.productId);
        if (seen.has(id)) return;
        seen.add(id);

        const candidate = toCandidate(product, scrapedAt);
        if (candidate.price === undefined) {
          rejected.push({ externalId: id, name: candidate.name, reason: "prezzo non pubblicato nel volantino" });
          return;
        }
        if (candidate.validTo && Date.parse(candidate.validTo) < now) {
          rejected.push({ externalId: id, name: candidate.name, reason: "offerta scaduta" });
          return;
        }
        collect(candidate, offers, rejected);
      });
      await sleep(REQUEST_DELAY_MS);
    }

    return { offers, rejected, pages };
  },
};
