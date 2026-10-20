import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, endOfDayIso, parseEuro, parseUnitPrice, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const LISTING_URL =
  "https://www.eurospin.com/content/eurospin/it/it/home/products/jcr:content/root/container/productlisting.model.json";
const PROMOTION_TYPES = ["offerta", "family", "limitati", "ribassati"];
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const REQUEST_DELAY_MS = 500;

interface EurospinItem {
  code?: string;
  name?: string;
  brand?: string | null;
  weight?: string | null;
  imageUrl?: string | null;
  visiblePrice?: string | null;
  visibleOriginalPrice?: string | null;
  visiblePriceToKg?: string | null;
  visiblePriceToLt?: string | null;
  promotionType?: string;
  promotionEndDate?: string | null;
  productUrl?: string;
}

interface EurospinPage {
  items?: EurospinItem[];
  totalPages?: number;
}

function pageUrl(page: number): string {
  const params = new URLSearchParams({ q: "", page: String(page), size: String(PAGE_SIZE) });
  for (const type of PROMOTION_TYPES) params.append("by_typeOffer", type);
  return `${LISTING_URL}?${params}`;
}

// "21/10/2026" -> "2026-10-21"
function italianSlashDate(text: string | null | undefined): string | null {
  const match = text?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export const eurospinAdapter: ChainAdapter = {
  chainId: "eurospin",
  chainName: "Eurospin",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers: ScrapedOffer[] = [];
    const rejected: RejectedItem[] = [];
    const pages: string[] = [];
    const seen = new Set<string>();
    const now = Date.now();

    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
      const url = pageUrl(page);
      pages.push(url);
      let data: EurospinPage;
      try {
        data = JSON.parse(await fetchText(url)) as EurospinPage;
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `pagina ${page} non scaricata: ${(error as Error).message}` });
        continue;
      }
      totalPages = data.totalPages ?? totalPages;

      for (const item of data.items ?? []) {
        const externalId = item.code ?? "";
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);

        const price = parseEuro(item.visiblePrice);
        const original = parseEuro(item.visibleOriginalPrice);
        const originalPrice = price !== null && original !== null && original > price ? original : null;
        const unit =
          parseUnitPrice(item.visiblePriceToKg ? `1 kg ${item.visiblePriceToKg.replace("/Kg", "")}` : null) ??
          parseUnitPrice(item.visiblePriceToLt ? `1 l ${item.visiblePriceToLt.replace(/\/l(t)?/i, "")}` : null) ??
          (price !== null ? unitPriceFromPackage(price, item.weight) : null);
        const endDate = italianSlashDate(item.promotionEndDate);
        const validTo = endDate ? endOfDayIso(endDate) : undefined;

        const candidate = {
          chainId: "eurospin",
          externalId,
          sourceUrl: item.productUrl ?? "",
          name: (item.name ?? "").trim(),
          brand: item.brand?.trim() || null,
          description: null,
          imageUrl: item.imageUrl ?? null,
          category: null,
          price,
          originalPrice,
          discountPercent: price !== null ? discountPercent(price, originalPrice) : null,
          requiresLoyaltyCard: item.promotionType === "family",
          packageText: item.weight ?? null,
          unitPrice: unit?.unitPrice ?? null,
          unit: unit?.unit ?? null,
          validFrom: scrapedAt,
          validTo,
          scrapedAt,
        };

        if (validTo && Date.parse(validTo) < now) {
          rejected.push({ externalId, name: candidate.name, reason: "offerta scaduta" });
          continue;
        }
        collect(candidate, offers, rejected);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    return { offers, rejected, pages };
  },
};
