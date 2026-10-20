import * as cheerio from "cheerio";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, mapLimit, sleep } from "../http";
import {
  discountPercent,
  endOfDayIso,
  extractBrand,
  parseEuro,
  parseItalianDates,
  parseUnitPrice,
  startOfDayIso,
  unitPriceFromPackage,
} from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const BASE = "https://www.penny.it";
const OFFERS_PAGE = `${BASE}/offerte`;
const DETAIL_CONCURRENCY = 3;
const DETAIL_DELAY_MS = 300;

interface PriceTier {
  label: string;
  price: number | null;
  unitText: string;
  strikePrice: number | null;
}

async function discoverPages(): Promise<string[]> {
  const pages = new Set([OFFERS_PAGE]);
  try {
    const html = await fetchText(OFFERS_PAGE);
    for (const match of html.matchAll(/href="(\/categorie\/volantino[^"#?]*)"/gi)) pages.add(BASE + match[1]);
  } catch {
    // si usa almeno la pagina offerte
  }
  return [...pages];
}

async function fetchImage(slug: string): Promise<string | null> {
  try {
    const html = await fetchText(`${BASE}/prodotto/${slug}`, { retries: 1 });
    await sleep(DETAIL_DELAY_MS);
    const image = cheerio.load(html)('meta[property="og:image"]').attr("content");
    return image && image.startsWith("http") ? image : null;
  } catch {
    return null;
  }
}

function readTiers($: cheerio.CheerioAPI, tile: cheerio.Cheerio<any>): PriceTier[] {
  return tile
    .find('[data-test="product-price-type"]')
    .map((_, element) => {
      const type = $(element);
      return {
        label: type.find('[data-test="product-price-type-price-label"]').text().trim(),
        price: parseEuro(type.find(".ws-product-price-value__main").first().text()),
        unitText: type.find('[data-test="product-price-type-label"]').text().trim(),
        strikePrice: parseEuro(type.find(".ws-product-price-strike s").first().text()),
      };
    })
    .get();
}

export const pennyAdapter: ChainAdapter = {
  chainId: "penny",
  chainName: "Penny",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers: ScrapedOffer[] = [];
    const rejected: RejectedItem[] = [];
    const pages = await discoverPages();
    const now = Date.now();

    interface Draft {
      candidate: Record<string, unknown>;
      slug: string;
    }
    const drafts = new Map<string, Draft>();

    for (const page of pages) {
      let html: string;
      try {
        html = await fetchText(page);
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `pagina non scaricata ${page}: ${(error as Error).message}` });
        continue;
      }

      const $ = cheerio.load(html);
      $('[data-test="product-tile"]').each((_, element) => {
        const tile = $(element);
        const slug = tile.attr("data-product-slug") ?? "";
        const name = (tile.attr("data-teaser-name") ?? tile.find('[data-test="product-title"]').text())
          .trim()
          .replace(/(\p{L})"(\p{L})/gu, "$1'$2");
        const externalId = slug.match(/(\d+)$/)?.[1] ?? slug;
        if (!slug || !name || drafts.has(externalId)) return;

        const tiers = readTiers($, tile);
        const withCard = tiers.find((t) => /con\s+pennycard/i.test(t.label));
        const withoutCard = tiers.find((t) => /senza\s+pennycard/i.test(t.label));
        const best = withCard ?? tiers[0];
        const price = best?.price ?? null;
        const originalPrice = withCard ? (withoutCard?.price ?? null) : (best?.strikePrice ?? null);
        const packageText = tile
          .find('[data-test="product-information-piece-description"] li')
          .map((__, li) => $(li).text().trim())
          .get()
          .filter(Boolean)
          .join(", ");
        const unit = parseUnitPrice(best?.unitText) ?? (price ? unitPriceFromPackage(price, packageText) : null);
        const dates = parseItalianDates(tile.find('[data-test="product-price-validity"]').text());
        const candidate = {
          chainId: "penny",
          externalId,
          sourceUrl: `${BASE}/prodotto/${slug}`,
          name,
          brand: extractBrand(name),
          description: null,
          imageUrl: null as string | null,
          category: null,
          price,
          originalPrice,
          discountPercent: price ? discountPercent(price, originalPrice) : null,
          requiresLoyaltyCard: Boolean(withCard),
          packageText: packageText || null,
          unitPrice: unit?.unitPrice ?? null,
          unit: unit?.unit ?? null,
          validFrom: dates[0] ? startOfDayIso(dates[0]) : scrapedAt,
          validTo: dates[1] ? endOfDayIso(dates[1]) : undefined,
          scrapedAt,
        };
        drafts.set(externalId, { candidate, slug });
      });
    }

    const live = [...drafts.values()].filter(({ candidate }) => {
      const validTo = candidate.validTo as string | undefined;
      if (validTo && Date.parse(validTo) < now) {
        rejected.push({ externalId: String(candidate.externalId), name: String(candidate.name), reason: "offerta scaduta" });
        return false;
      }
      return true;
    });

    const images = await mapLimit(live, DETAIL_CONCURRENCY, ({ slug }) => fetchImage(slug));
    live.forEach(({ candidate }, index) => {
      candidate.imageUrl = images[index];
      collect(candidate, offers, rejected);
    });

    return { offers, rejected, pages };
  },
};
