import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, endOfDayIso, startOfDayIso, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

// Piattaforma e-commerce usata da Tigros, Basko e altre insegne: il catalogo "promo=true" elenca i prodotti in offerta.
interface EbsnPromo {
  discountPerc?: number;
  validityDate?: string;
  expireDate?: string;
  view?: { labelCardOnly?: boolean; cssClass?: string; header?: string };
}

interface EbsnProduct {
  productId?: number;
  name?: string;
  shortDescr?: string;
  description?: string;
  barcode?: string;
  itemUrl?: string;
  mediaURL?: string;
  mediaURLMedium?: string;
  priceDisplay?: number;
  priceStandardDisplay?: number;
  priceUmDisplay?: number;
  weightUnitDisplay?: string;
  warehousePromo?: EbsnPromo;
  vendor?: { name?: string };
}

interface EbsnPage {
  data?: {
    page?: { totPages?: number };
    products?: EbsnProduct[];
  };
}

interface EbsnConfig {
  chainId: string;
  chainName: string;
  baseUrl: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 60;
const REQUEST_DELAY_MS = 400;

// "13/10/2026" -> "2026-10-13"
function slashDate(text: string | undefined): string | null {
  const match = text?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function unitOf(label: string | undefined): "kg" | "l" | null {
  const value = label?.trim().toUpperCase();
  if (value === "KG") return "kg";
  if (value === "L" || value === "LT") return "l";
  return null;
}

export function createEbsnAdapter({ chainId, chainName, baseUrl }: EbsnConfig): ChainAdapter {
  return {
    chainId,
    chainName,

    async scrape(): Promise<AdapterResult> {
      const scrapedAt = new Date().toISOString();
      const offers: ScrapedOffer[] = [];
      const rejected: RejectedItem[] = [];
      const pages: string[] = [];
      const seen = new Set<string>();
      const now = Date.now();

      let totalPages = 1;
      for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
        const url = `${baseUrl}/ebsn/api/products?promo=true&page=${page}&page_size=${PAGE_SIZE}&hash=w0d0t0`;
        pages.push(url);
        let data: EbsnPage;
        try {
          data = JSON.parse(await fetchText(url)) as EbsnPage;
        } catch (error) {
          rejected.push({ externalId: null, name: null, reason: `pagina ${page} non scaricata: ${(error as Error).message}` });
          continue;
        }
        totalPages = data.data?.page?.totPages ?? totalPages;

        for (const product of data.data?.products ?? []) {
          const externalId = String(product.productId ?? "");
          if (!externalId || seen.has(externalId)) continue;
          seen.add(externalId);

          const promoView = product.warehousePromo?.view;
          if (/promo_mxn/.test(promoView?.cssClass ?? "") || /pezz/i.test(promoView?.header ?? "")) {
            rejected.push({ externalId, name: product.name ?? null, reason: "promozione multipack non gestita" });
            continue;
          }

          const brand = (product.shortDescr ?? product.vendor?.name ?? "").trim() || null;
          const baseName = (product.name ?? "").trim();
          const name = brand && !baseName.toUpperCase().includes(brand.toUpperCase()) ? `${brand} ${baseName}` : baseName;
          const price = product.priceDisplay;
          const standard = product.priceStandardDisplay;
          const originalPrice = price !== undefined && standard !== undefined && standard > price ? standard : null;
          const promo = product.warehousePromo;
          const packageText = product.description?.trim() || null;
          const unitLabel = unitOf(product.weightUnitDisplay);
          const unit =
            unitLabel && product.priceUmDisplay && product.priceUmDisplay > 0
              ? { unitPrice: Math.round(product.priceUmDisplay * 100) / 100, unit: unitLabel }
              : price
                ? unitPriceFromPackage(price, packageText)
                : null;
          const from = slashDate(promo?.validityDate);
          const to = slashDate(promo?.expireDate);

          const candidate = {
            chainId,
            externalId,
            sourceUrl: `${baseUrl}${product.itemUrl ?? ""}`,
            name,
            brand,
            description: null,
            imageUrl: product.mediaURLMedium ?? product.mediaURL ?? null,
            category: null,
            price,
            originalPrice,
            discountPercent:
              promo?.discountPerc && promo.discountPerc > 0 ? Math.round(promo.discountPerc) : price ? discountPercent(price, originalPrice) : null,
            requiresLoyaltyCard: promo?.view?.labelCardOnly === true,
            packageText,
            unitPrice: unit?.unitPrice ?? null,
            unit: unit?.unit ?? null,
            validFrom: from ? startOfDayIso(from) : scrapedAt,
            validTo: to ? endOfDayIso(to) : undefined,
            scrapedAt,
            ean: product.barcode || null,
            channel: "online" as const,
          };

          if (candidate.validTo && Date.parse(candidate.validTo) < now) {
            rejected.push({ externalId, name, reason: "offerta scaduta" });
            continue;
          }
          collect(candidate, offers, rejected);
        }
        await sleep(REQUEST_DELAY_MS);
      }

      return { offers, rejected, pages };
    },
  };
}

// Basko usa la stessa piattaforma ma mostra i prezzi solo dopo la scelta di un negozio: non è utilizzabile in forma anonima.
export const tigrosAdapter = createEbsnAdapter({ chainId: "tigros", chainName: "Tigros", baseUrl: "https://www.tigros.it" });
