import { createHash } from "node:crypto";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { parseEkomPage } from "../ekom-parse";
import { fetchBinary, fetchText } from "../http";
import { extractPdfPages } from "../pdf";
import { endOfDayIso, startOfDayIso } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const BASE = "https://www.ekomdiscount.it";
const LEAFLETS_URL = `${BASE}/ebsn/api/leaflet/search?parent_leaflet_type_id=1`;

interface Leaflet {
  leafletId: number;
  name: string;
  descr: string;
  validateDateFrom: string;
  validateDateTo: string;
  baseLocation: string;
  location: string;
}

const day = (value: string) => value.slice(0, 10);

// Il codice regione è il suffisso del nome del file ("EKOMPromo22-LGPM.pdf" -> "LGPM").
function regionCode(leaflet: Leaflet): string {
  return leaflet.location.match(/-([A-Za-z]{2,6})\.pdf$/i)?.[1].toUpperCase() ?? `L${leaflet.leafletId}`;
}

export const ekomAdapter: ChainAdapter = {
  chainId: "ekom",
  chainName: "Ekom",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers: ScrapedOffer[] = [];
    const rejected: RejectedItem[] = [];
    const pages: string[] = [LEAFLETS_URL];
    const now = Date.now();

    const list = JSON.parse(await fetchText(LEAFLETS_URL)) as { data?: { leaflets?: Leaflet[] } };
    for (const leaflet of list.data?.leaflets ?? []) {
      if (!leaflet.location.toLowerCase().endsWith(".pdf")) continue;
      const validTo = endOfDayIso(day(leaflet.validateDateTo));
      if (Date.parse(validTo) < now) continue;

      const url = `${leaflet.baseLocation}${leaflet.location}`;
      pages.push(url);
      const code = regionCode(leaflet);
      const seen = new Set<string>();

      let pdfPages;
      try {
        pdfPages = await extractPdfPages(await fetchBinary(url));
      } catch (error) {
        rejected.push({ externalId: null, name: leaflet.descr, reason: `PDF ${code} non letto: ${(error as Error).message}` });
        continue;
      }

      for (const items of pdfPages) {
        const parsed = parseEkomPage(items);
        for (const skipped of parsed.skipped) {
          rejected.push({ externalId: null, name: skipped.text || null, reason: `${code}: ${skipped.reason}` });
        }
        for (const block of parsed.blocks) {
          const id = createHash("sha1").update(`${code}|${block.name}|${block.price}`).digest("hex").slice(0, 12);
          if (seen.has(id)) continue;
          seen.add(id);
          collect(
            {
              chainId: "ekom",
              externalId: id,
              sourceUrl: url,
              name: block.name,
              brand: null,
              description: null,
              imageUrl: null,
              category: null,
              price: block.price,
              originalPrice: block.originalPrice,
              discountPercent: block.discountPercent,
              requiresLoyaltyCard: false,
              packageText: block.packageText,
              unitPrice: block.unitPrice,
              unit: block.unit,
              validFrom: startOfDayIso(day(leaflet.validateDateFrom)),
              validTo,
              scrapedAt,
              storeCode: code,
              channel: "volantino" as const,
            },
            offers,
            rejected,
          );
        }
      }
    }

    return { offers, rejected, pages };
  },
};
