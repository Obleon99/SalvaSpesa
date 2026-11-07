import { sha1Hex } from "../hash";
import { scraperConfig } from "../config";
import { collect, type AdapterResult, type ChainAdapter, type RejectedItem } from "../adapter";
import { flyerValidityOf, pageValidityOf, parseCoopPage, type CoopBlock, type Validity } from "../coop-parse";
import { fetchBinary, fetchText, sleep } from "../http";
import { endOfDayIso, startOfDayIso } from "../parse";
import { extractPdfPages } from "../pdf";
import type { ScrapedOffer } from "@salvaspesa/shared-types";

// I volantini Coop Liguria sono pubblicati da Volantino Più: ogni punto vendita ha una pagina (codice "ccno") che rimanda ai volantini in corso (PDF con testo).
const SITE = "https://negozi.volantinopiu.com";
const CHANNEL_PAGE = "coopliguria";
const REQUEST_DELAY_MS = 500;

interface Flyer {
  id: string;
  pdfUrl: string;
  validity: Validity;
  blocks: CoopBlock[];
  skipped: { text: string; reason: string }[];
}

const flyers = new Map<string, Promise<Flyer | null>>();

const today = () => new Date().toISOString().slice(0, 10);

// Codici dei punti vendita da leggere: COOP_STORES="8001120026330,..." (scritti dall'app in data/tracked.json).
const configuredStores = () => scraperConfig.coopStores.filter((s) => /^\d{6,16}$/.test(s));

// Senza negozi indicati si prende il primo punto vendita Coop Liguria vicino a Genova, per poter provare lo scraper da riga di comando.
async function defaultStore(): Promise<string | null> {
  const response = await fetch(`${SITE}/public/ajax/get.maps.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; SalvaSpesaBot/0.1; progetto personale di confronto prezzi)" },
    body: JSON.stringify({ id_canale: "15", id_subcanale: "16", tipo: "punti_vendita", lat: 44.4056, lng: 8.9463, allowed: 1, uri: `/${CHANNEL_PAGE}.html`, landing: CHANNEL_PAGE }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { points?: { landing?: string }[] };
  return data.points?.[0]?.landing?.match(/ccno-(\d+)\.html/)?.[1] ?? null;
}

async function loadFlyer(flyerId: string, pvId: string): Promise<Flyer | null> {
  const viewer = await fetchText(`${SITE}/redirect${flyerId}.html?id_pv=${pvId}`);
  const pdf = viewer.match(/(?:https?:)?\/\/resources\.volantinopiu\.it\/flyer\/[^"'\s)]+?\.pdf/)?.[0];
  if (!pdf) return null;
  const pdfUrl = pdf.startsWith("//") ? `https:${pdf}` : pdf;
  const pages = await extractPdfPages(await fetchBinary(pdfUrl, 240000));
  const year = new Date().getFullYear();
  const validity = flyerValidityOf(pages, year);
  if (!validity) return null;
  const blocks: CoopBlock[] = [];
  const skipped: Flyer["skipped"] = [];
  for (const items of pages) {
    const parsed = parseCoopPage(items, pageValidityOf(items, year), validity);
    blocks.push(...parsed.blocks);
    skipped.push(...parsed.skipped);
  }
  return { id: flyerId, pdfUrl, validity, blocks, skipped };
}

export const coopAdapter: ChainAdapter = {
  chainId: "coop",
  chainName: "Coop",

  async scrape(): Promise<AdapterResult> {
    const scrapedAt = new Date().toISOString();
    const offers: ScrapedOffer[] = [];
    const rejected: RejectedItem[] = [];
    const pages: string[] = [];
    const day = today();

    let codes = configuredStores();
    if (codes.length === 0) {
      const fallback = await defaultStore();
      codes = fallback ? [fallback] : [];
    }

    for (const code of codes) {
      const landing = `${SITE}/ccno-${code}.html?landing=${CHANNEL_PAGE}`;
      pages.push(landing);
      let html: string;
      try {
        html = await fetchText(landing);
      } catch (error) {
        rejected.push({ externalId: null, name: null, reason: `${code}: pagina del punto vendita non letta: ${(error as Error).message}` });
        continue;
      }
      const pvId = html.match(/redirect\d+\.html\?id_pv=(\d+)/)?.[1];
      const flyerIds = [...new Set([...html.matchAll(/redirect(\d+)\.html\?id_pv=\d+/g)].map((m) => m[1]))];
      if (!pvId || flyerIds.length === 0) {
        rejected.push({ externalId: null, name: null, reason: `${code}: nessun volantino collegato al punto vendita` });
        continue;
      }

      const seen = new Set<string>();
      for (const flyerId of flyerIds) {
        if (!flyers.has(flyerId)) {
          flyers.set(
            flyerId,
            loadFlyer(flyerId, pvId).catch((error) => {
              rejected.push({ externalId: null, name: null, reason: `volantino ${flyerId} non letto: ${(error as Error).message}` });
              return null;
            }),
          );
        }
        const flyer = await flyers.get(flyerId)!;
        await sleep(REQUEST_DELAY_MS);
        if (!flyer) continue;
        pages.push(flyer.pdfUrl);
        for (const skipped of flyer.skipped) rejected.push({ externalId: null, name: skipped.text || null, reason: `volantino ${flyer.id}: ${skipped.reason}` });

        for (const block of flyer.blocks) {
          const from = block.validFrom ?? flyer.validity.from ?? day;
          const to = block.validTo ?? flyer.validity.to;
          // Solo le offerte valide oggi: le pagine di settimane passate o future restano fuori.
          if (from > day || to < day) continue;
          // L'identificativo non contiene il prezzo né le date: lo stesso prodotto tiene lo stesso id settimana dopo settimana, per lo storico.
          const externalId = sha1Hex(`coop|${block.name}|${block.packageText ?? ""}|${block.loyalty}`).slice(0, 14);
          if (seen.has(externalId)) continue;
          seen.add(externalId);
          collect(
            {
              chainId: "coop",
              externalId,
              sourceUrl: flyer.pdfUrl,
              name: block.name,
              brand: null,
              description: null,
              imageUrl: null,
              category: null,
              price: block.price,
              originalPrice: block.originalPrice,
              discountPercent: block.discountPercent,
              requiresLoyaltyCard: block.loyalty,
              packageText: block.packageText,
              unitPrice: block.unitPrice,
              unit: block.unit,
              validFrom: startOfDayIso(from),
              validTo: endOfDayIso(to),
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
