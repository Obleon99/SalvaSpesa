import * as cheerio from "cheerio";
import { scraperConfig } from "../config";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { fetchText, sleep } from "../http";
import { discountPercent, endOfDayIso, startOfDayIso, unitPriceFromPackage } from "../parse";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

const SITE = "https://www.esselunga.it";
const GRID = `${SITE}/services/istituzionale35/digital-grid`;
// Codice del negozio nel sito Esselunga (default Affori, Milano). Più negozi: ESSELUNGA_STORES="AFF,ADR".
const configuredStores = () => scraperConfig.esselungaStores;
const PAGE_ROWS = 100;
const MAX_PAGES = 15;
const REQUEST_DELAY_MS = 400;

interface GridItem {
  code?: string;
  title?: string;
  prezzo?: number;
  prezzoAl?: number;
  misuraPrezzoAl?: string;
  imgUrl?: string;
  promozioni_prezzoPromo?: number[];
  promozioni_prezzoPromoAl?: number[];
  promozioni_misuraPrezzoPromoAl?: string[];
  promozioni_scontoPercentuale?: string[];
  promozioni_desMeccanica?: string[];
  promozioni_dataInizioPromoArticolo?: string[];
  promozioni_dataFinePromoArticolo?: string[];
  related_items?: GridItem[];
}

interface GridPage {
  item_found?: number;
  items?: GridItem[];
}

const gridUrl = (parts: Record<string, string | number>) =>
  `${GRID}.${Object.entries(parts).map(([k, v]) => `${k}:${v}`).join(".")}.json`;

async function discoverPromotions(store: string): Promise<{ codPromo: string; name: string }[]> {
  const sitemap = await fetchText(`${SITE}/it-it/sitemap.xml`);
  const storePage = sitemap.match(new RegExp(`<loc>(${SITE.replace(/\./g, "\\.")}/it-it/promozioni/volantini\\.[^<]*\\.${store.toLowerCase()}\\.html)</loc>`));
  if (!storePage) throw new Error(`negozio ${store} non trovato nella sitemap`);

  const $ = cheerio.load(await fetchText(storePage[1]));
  const found = new Map<string, string>();
  $("a[href]").each((_, a) => {
    const match = ($(a).attr("href") ?? "").match(/volantino-digitale\.([a-z0-9-]+)\.[a-z]+\.(\d+)\.html/i);
    if (match) found.set(match[2], match[1]);
  });
  return [...found.entries()].map(([codPromo, name]) => ({ codPromo, name }));
}

function flatten(items: GridItem[]): GridItem[] {
  return items.flatMap((item) => (item.related_items ? flatten(item.related_items) : item.code ? [item] : []));
}

const dayOf = (iso: string | undefined) => iso?.slice(0, 10);

export const esselungaAdapter: ChainAdapter = {
  chainId: "esselunga",
  chainName: "Esselunga",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers = new Map<string, ScrapedOffer>();
    const rejected: RejectedItem[] = [];
    const pages: string[] = [];
    const now = Date.now();

    for (const store of configuredStores()) {
      let promotions: { codPromo: string; name: string }[] = [];
      try {
        promotions = await discoverPromotions(store);
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `negozio ${store}: ${(error as Error).message}` });
        continue;
      }

      for (const { codPromo, name: promoName } of promotions) {
        for (let page = 0; page < MAX_PAGES; page++) {
          const url = gridUrl({ condition: "nav_menu", abbrev: store, page, rows: PAGE_ROWS, codPromo });
          pages.push(url);
          let data: GridPage;
          try {
            data = JSON.parse(await fetchText(url)) as GridPage;
          } catch (error) {
            rejected.push({ externalId: null, name: null, reason: `${promoName} pagina ${page}: ${(error as Error).message}` });
            break;
          }
          const items = data.items ?? [];
          if (items.length === 0) break;

          for (const item of flatten(items)) {
            const externalId = String(item.code);
            const title = (item.title ?? "").trim();
            const promoPrice = item.promozioni_prezzoPromo?.[0] ?? 0;
            const mechanic = item.promozioni_desMeccanica?.[0] ?? "";
            if (promoPrice <= 0) {
              rejected.push({ externalId, name: title, reason: `meccanica non gestita: ${mechanic || "n/d"}` });
              continue;
            }

            const regular = item.prezzo && item.prezzo > promoPrice ? item.prezzo : null;
            const promoPerUnit = item.promozioni_prezzoPromoAl?.[0] ?? 0;
            const unitLabel = (item.promozioni_misuraPrezzoPromoAl?.[0] || item.misuraPrezzoAl || "").toUpperCase();
            const unit =
              promoPerUnit > 0 && (unitLabel === "KG" || unitLabel === "L")
                ? { unitPrice: promoPerUnit, unit: unitLabel.toLowerCase() as "kg" | "l" }
                : unitPriceFromPackage(promoPrice, title);
            const percent = Number(item.promozioni_scontoPercentuale?.[0]);
            const start = dayOf(item.promozioni_dataInizioPromoArticolo?.[0]);
            const end = dayOf(item.promozioni_dataFinePromoArticolo?.[0]);

            const candidate = {
              chainId: "esselunga",
              externalId,
              sourceUrl: `${SITE}/it-it/promozioni/volantini/volantino-digitale.${promoName}.${store.toLowerCase()}.${codPromo}.html`,
              name: title,
              brand: null,
              description: null,
              imageUrl: item.imgUrl ?? null,
              category: null,
              price: promoPrice,
              originalPrice: regular,
              discountPercent: Number.isFinite(percent) && percent > 0 ? percent : discountPercent(promoPrice, regular),
              requiresLoyaltyCard: /f[iì]daty|carta/i.test(mechanic),
              packageText: null,
              unitPrice: unit?.unitPrice ?? null,
              unit: unit?.unit ?? null,
              validFrom: start ? startOfDayIso(start) : scrapedAt,
              validTo: end ? endOfDayIso(end) : undefined,
              scrapedAt,
              storeCode: store,
            };

            if (candidate.validTo && Date.parse(candidate.validTo) < now) {
              rejected.push({ externalId, name: title, reason: "offerta scaduta" });
              continue;
            }
            const collected: ScrapedOffer[] = [];
            collect(candidate, collected, rejected);
            const offer = collected[0];
            if (offer && (!offers.has(externalId) || offer.price < (offers.get(externalId)?.price ?? Infinity))) {
              offers.set(externalId, offer);
            }
          }
          await sleep(REQUEST_DELAY_MS);
          if (items.length < PAGE_ROWS) break;
        }
      }
    }

    return { offers: [...offers.values()], rejected, pages };
  },
};
