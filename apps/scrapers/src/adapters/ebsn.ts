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

function toCandidate(config: EbsnConfig, product: EbsnProduct, scrapedAt: string, catalog: { category: string | null; validTo: string } | null) {
  const { chainId, baseUrl } = config;
  const externalId = String(product.productId ?? "");
  const brand = (product.shortDescr ?? product.vendor?.name ?? "").trim() || null;
  const baseName = (product.name ?? "").trim();
  const name = brand && !baseName.toUpperCase().includes(brand.toUpperCase()) ? `${brand} ${baseName}` : baseName;
  const price = product.priceDisplay;
  const standard = product.priceStandardDisplay;
  const originalPrice = price !== undefined && standard !== undefined && standard > price ? standard : null;
  const promo = catalog ? undefined : product.warehousePromo;
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

  return {
    chainId,
    externalId,
    sourceUrl: `${baseUrl}${product.itemUrl ?? ""}`,
    name,
    brand,
    description: null,
    imageUrl: product.mediaURLMedium ?? product.mediaURL ?? null,
    category: catalog?.category ?? null,
    price,
    originalPrice,
    discountPercent:
      promo?.discountPerc && promo.discountPerc > 0 ? Math.round(promo.discountPerc) : price ? discountPercent(price, originalPrice) : null,
    requiresLoyaltyCard: promo?.view?.labelCardOnly === true,
    packageText,
    unitPrice: unit?.unitPrice ?? null,
    unit: unit?.unit ?? null,
    validFrom: from ? startOfDayIso(from) : scrapedAt,
    validTo: catalog ? catalog.validTo : to ? endOfDayIso(to) : undefined,
    scrapedAt,
    ean: product.barcode || null,
    channel: "online" as const,
  };
}

const CATALOG_DAYS = 7;
const CATALOG_PAGE_SIZE = 100;
const CATALOG_MAX_PAGES_PER_CATEGORY = 60;

// Reparti non alimentari che non servono al confronto della spesa.
const SKIP_CATEGORIES = /elettronica|giocatt|abbigliamento|giardin|bricolage|cartoleria|libri/i;

async function scrapeCatalog(config: EbsnConfig): Promise<AdapterResult> {
  const { baseUrl } = config;
  const scrapedAt = new Date().toISOString();
  const validTo = new Date(Date.now() + CATALOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const offers: ScrapedOffer[] = [];
  const rejected: RejectedItem[] = [];
  const pages: string[] = [];
  const seen = new Set<string>();

  const tree = JSON.parse(await fetchText(`${baseUrl}/ebsn/api/category?filtered=false&depth=2&hash=w0d0t0`)) as {
    data?: { categories?: { categoryId: number; name: string }[] };
  };
  for (const category of tree.data?.categories ?? []) {
    if (SKIP_CATEGORIES.test(category.name)) continue;
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, CATALOG_MAX_PAGES_PER_CATEGORY); page++) {
      const url = `${baseUrl}/ebsn/api/products?parent_category_id=${category.categoryId}&page=${page}&page_size=${CATALOG_PAGE_SIZE}&hash=w0d0t0`;
      pages.push(url);
      let data: EbsnPage;
      try {
        data = JSON.parse(await fetchText(url)) as EbsnPage;
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `${category.name} pagina ${page}: ${(error as Error).message}` });
        continue;
      }
      totalPages = data.data?.page?.totPages ?? totalPages;
      for (const product of data.data?.products ?? []) {
        const externalId = String(product.productId ?? "");
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);
        collect(toCandidate(config, product, scrapedAt, { category: category.name, validTo }), offers, rejected);
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return { offers, rejected, pages };
}

export function createEbsnAdapter(config: EbsnConfig): ChainAdapter {
  const { chainId, chainName, baseUrl } = config;
  return {
    chainId,
    chainName,
    scrapeCatalog: () => scrapeCatalog(config),

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

          const candidate = toCandidate(config, product, scrapedAt, null);
          if (candidate.validTo && Date.parse(candidate.validTo) < now) {
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
}

// Basko usa la stessa piattaforma ma mostra i prezzi solo dopo la scelta di un negozio: non è utilizzabile in forma anonima.
export const tigrosAdapter = createEbsnAdapter({ chainId: "tigros", chainName: "Tigros", baseUrl: "https://www.tigros.it" });
