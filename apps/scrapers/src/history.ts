import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// Storico compatto dei prezzi: data/history/<catena>[/<negozio>].json
// { prodotto: { p: [[data, prezzo, prezzoPieno|null], ...], seen: ultimaData } }
// Si aggiunge un punto solo quando il prezzo cambia; "seen" dice fino a quando il prodotto è stato visto allo stesso prezzo.
export type HistoryPoint = [date: string, price: number, originalPrice: number | null];
export interface HistoryEntry {
  p: HistoryPoint[];
  seen: string;
}
export type HistoryFile = Record<string, HistoryEntry>;

const DATA = path.resolve(import.meta.dirname, "../../../data");
export const historyFile = (chainId: string, storeCode: string) => path.join(DATA, "history", chainId, `${storeCode || "all"}.json`);

interface Item {
  externalId: string;
  price: number;
  originalPrice: number | null;
}

export function applyDay(history: HistoryFile, date: string, items: Item[]): void {
  for (const item of items) {
    if (typeof item.price !== "number" || !Number.isFinite(item.price)) continue;
    const entry = (history[item.externalId] ??= { p: [], seen: date });
    const last = entry.p[entry.p.length - 1];
    if (last && last[0] === date) {
      // Stesso giorno visto da due fonti (offerta e listino): vale il prezzo più basso.
      if (item.price < last[1]) entry.p[entry.p.length - 1] = [date, item.price, item.originalPrice];
    } else if (!last || last[1] !== item.price || last[2] !== item.originalPrice) {
      entry.p.push([date, item.price, item.originalPrice]);
    }
    if (date > entry.seen) entry.seen = date;
  }
}

async function readHistory(file: string): Promise<HistoryFile | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as HistoryFile;
  } catch {
    return null;
  }
}

async function writeHistory(file: string, history: HistoryFile): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(history));
  await rename(temp, file);
}

// Prima volta per una catena: si ricostruisce lo storico dagli snapshot giornalieri già salvati (offerte e listino).
async function backfill(chainId: string, storeCode: string): Promise<HistoryFile> {
  const history: HistoryFile = {};
  const days = new Map<string, Item[]>();
  for (const kind of ["offers", "catalog"]) {
    const dir = path.join(DATA, kind, chainId, storeCode);
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const snapshot = JSON.parse(await readFile(path.join(dir, file), "utf8")) as { offers: Item[] };
        const date = file.slice(0, 10);
        days.set(date, [...(days.get(date) ?? []), ...snapshot.offers]);
      } catch {
        // snapshot illeggibile: si salta
      }
    }
  }
  for (const date of [...days.keys()].sort()) applyDay(history, date, days.get(date)!);
  return history;
}

export async function recordHistory(chainId: string, storeCode: string, date: string, items: Item[]): Promise<number> {
  const file = historyFile(chainId, storeCode);
  // Il backfill legge anche lo snapshot appena scritto: l'applicazione dello stesso giorno è idempotente.
  const history = (await readHistory(file)) ?? (await backfill(chainId, storeCode));
  applyDay(history, date, items);
  await writeHistory(file, history);
  return Object.keys(history).length;
}
