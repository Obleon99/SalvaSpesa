import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScrapedOffer } from "@salvaspesa/shared-types";
import type { ChainAdapter } from "./adapter";
import { lidlAdapter } from "./adapters/lidl";
import { pennyAdapter } from "./adapters/penny";
import { eurospinAdapter } from "./adapters/eurospin";
import { esselungaAdapter } from "./adapters/esselunga";
import { tigrosAdapter } from "./adapters/ebsn";
import { ekomAdapter } from "./adapters/ekom";

const adapters: ChainAdapter[] = [lidlAdapter, pennyAdapter, eurospinAdapter, esselungaAdapter, tigrosAdapter, ekomAdapter];
const DATA_DIR = path.resolve(import.meta.dirname, "../../../data/offers");

async function run(adapter: ChainAdapter): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`\n== ${adapter.chainName}`);
  try {
    const result = await adapter.scrape();
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const withImage = result.offers.filter((o) => o.imageUrl).length;
    const withUnit = result.offers.filter((o) => o.unitPrice !== null).length;

    // Le catene con prezzi per negozio (Esselunga) hanno una cartella per codice negozio: data/offers/<catena>/<NEGOZIO>/
    const groups = new Map<string, ScrapedOffer[]>();
    for (const offer of result.offers) {
      const key = offer.storeCode ?? "";
      groups.set(key, [...(groups.get(key) ?? []), offer]);
    }

    const scrapedAt = new Date().toISOString();
    for (const [storeCode, offers] of groups) {
      const dir = path.join(DATA_DIR, adapter.chainId, storeCode);
      await mkdir(dir, { recursive: true });
      const snapshot = JSON.stringify(
        { chainId: adapter.chainId, storeCode: storeCode || null, scrapedAt, pages: result.pages, offers, rejected: result.rejected },
        null,
        2,
      );
      await writeFile(path.join(dir, "latest.json"), snapshot);
      await writeFile(path.join(dir, `${scrapedAt.slice(0, 10)}.json`), snapshot);
    }

    console.log(`   pagine: ${result.pages.length}  offerte: ${result.offers.length}  scartate: ${result.rejected.length}  (${seconds}s)`);
    console.log(`   con immagine: ${withImage}/${result.offers.length}  con prezzo al kg/l: ${withUnit}/${result.offers.length}`);
    for (const item of result.rejected.slice(0, 5)) console.log(`   scartata: ${item.name ?? item.externalId} → ${item.reason}`);

    if (result.offers.length === 0) {
      console.error("   ATTENZIONE: nessuna offerta estratta, il sito potrebbe essere cambiato");
      return false;
    }
    return true;
  } catch (error) {
    console.error(`   ERRORE: ${(error as Error).message}`);
    return false;
  }
}

interface Tracked {
  chains?: string[];
  esselunga?: string[];
}

// --tracked: aggiorna solo le insegne e i negozi che l'app ha registrato in data/tracked.json (scritto dall'app web).
async function loadTracked(): Promise<Tracked | null> {
  try {
    return JSON.parse(await readFile(path.resolve(DATA_DIR, "../tracked.json"), "utf8")) as Tracked;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
const useTracked = args.includes("--tracked");
const requested = args.filter((arg) => !arg.startsWith("--"));

let tracked: Tracked | null = null;
if (useTracked) {
  tracked = await loadTracked();
  if (tracked?.esselunga?.length && !process.env.ESSELUNGA_STORES) process.env.ESSELUNGA_STORES = tracked.esselunga.join(",");
  console.log(tracked ? `Elenco registrato dall'app: ${(tracked.chains ?? []).join(", ") || "nessuna insegna"}` : "Nessun elenco registrato: aggiorno tutte le insegne.");
}

const wanted = requested.length > 0 ? requested : useTracked && tracked ? (tracked.chains ?? []) : null;
const selected = wanted ? adapters.filter((a) => wanted.includes(a.chainId)) : adapters;
if (selected.length === 0 && useTracked && requested.length === 0) {
  console.log("Nessun supermercato preferito registrato: niente da aggiornare.");
  process.exit(0);
}
if (selected.length === 0) {
  console.error(`Catena sconosciuta. Disponibili: ${adapters.map((a) => a.chainId).join(", ")}`);
  process.exit(1);
}

let allOk = true;
for (const adapter of selected) allOk = (await run(adapter)) && allOk;
console.log(`\nSnapshot in ${DATA_DIR}`);
process.exit(allOk ? 0 : 1);
