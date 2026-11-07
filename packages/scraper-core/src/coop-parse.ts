import type { PricingUnit } from "@salvaspesa/shared-types";
import type { PdfTextItem } from "./pdf";
import { discountPercent, unitPriceFromPackage } from "./parse";

export interface CoopBlock {
  name: string;
  packageText: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  unitPrice: number | null;
  unit: PricingUnit | null;
  // Prezzo riservato ai soci Coop.
  loyalty: boolean;
  // Periodo di validità stampato sulla pagina (YYYY-MM-DD); "from" manca quando la pagina dice solo "fino al".
  validFrom: string | null;
  validTo: string | null;
}

export interface CoopPageResult {
  blocks: CoopBlock[];
  skipped: { text: string; reason: string }[];
}

const MONTHS: Record<string, number> = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

const iso = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export interface Validity {
  from: string | null;
  to: string;
}

// "dal 15 al 28 ottobre 2026", "dal 28 ottobre al 3 novembre 2026", "fino al 21 ottobre 2026".
export function parseValidity(text: string, defaultYear: number): Validity | null {
  const lower = text.toLowerCase().replace(/[’']/g, "'");
  const range = lower.match(/dal\s+(\d{1,2})(?:\s+([a-zì]+))?\s+al(?:l')?\s*(\d{1,2})\s+([a-zì]+)(?:\s+(\d{4}))?/);
  if (range) {
    const toMonth = MONTHS[range[4]];
    const fromMonth = range[2] ? MONTHS[range[2]] : toMonth;
    if (!toMonth || !fromMonth) return null;
    const year = range[5] ? Number(range[5]) : defaultYear;
    const fromYear = fromMonth > toMonth ? year - 1 : year;
    return { from: iso(fromYear, fromMonth, Number(range[1])), to: iso(year, toMonth, Number(range[3])) };
  }
  const until = lower.match(/fino\s+al(?:l')?\s*(\d{1,2})\s+([a-zì]+)(?:\s+(\d{4}))?/);
  if (until && MONTHS[until[2]]) return { from: null, to: iso(until[3] ? Number(until[3]) : defaultYear, MONTHS[until[2]], Number(until[1])) };
  return null;
}

const INT = /^\d{1,3}$/;
const DEC = /^,\d{2}$/;
const UNIT_PRICE = /^(\d{1,3},\d{2})\s*€$/;
const LABEL = /^(CONVIENE|SOCI|SCONTO(?: SOCI)?|SOLO PER I|%)$/i;
const SIZE = /((?:\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l|lt)\b)/gi;

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s/+-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
    .replace(/(^|[\s/-])(\p{L})(['’])(\p{L})/gu, (_, sep: string, first: string, apostrophe: string, next: string) => `${sep}${first}${apostrophe}${next.toUpperCase()}`);

const fixAbbreviations = (text: string) => text.replace(/\b([dig])\.([ot])\.([pgt])\./gi, (_, a: string, b: string, c: string) => `${a}.${b}.${c}.`.toUpperCase());

const toNumber = (integer: string, decimals: string) => Number(`${integer}.${decimals.slice(1)}`);

interface Anchor {
  price: number;
  x: number;
  y: number;
  left: number;
  original: { value: number; x: number; y: number } | null;
}

// Legge i riquadri del volantino Coop: prezzo grande (intero + decimali), prezzo pieno più piccolo sopra, nome in maiuscolo,
// descrizione in corsivo piccolo, "X,XX € al kg" sotto il prezzo, etichette "SCONTO SOCI" / "SOLO PER I SOCI" / "CONVIENE".
export function parseCoopPage(items: PdfTextItem[], pageValidity: (y: number) => Validity | null, flyer: Validity): CoopPageResult {
  const blocks: CoopBlock[] = [];
  const skipped: CoopPageResult["skipped"] = [];
  const anchors: Anchor[] = [];

  for (const int of items) {
    if (!INT.test(int.str) || int.size < 28) continue;
    const dec = items
      .filter((d) => DEC.test(d.str) && d.size >= 18 && Math.abs(d.y - int.y) < 6 && d.x > int.x && d.x - int.x < 60)
      .sort((a, b) => a.x - b.x)[0];
    if (!dec) continue;

    // Prezzo pieno: stessa forma ma più piccola, sopra il prezzo grande e a sinistra.
    let original: Anchor["original"] = null;
    for (const o of items) {
      if (!INT.test(o.str) || o.size < 8 || o.size > 14) continue;
      const od = items.find((d) => DEC.test(d.str) && Math.abs(d.size - o.size) < 1.5 && Math.abs(d.y - o.y) < 3 && d.x > o.x && d.x - o.x < 30);
      if (!od || o.y - int.y < 20 || o.y - int.y > 130 || o.x > int.x + 10 || int.x - o.x > 70) continue;
      if (!original || o.y - int.y < original.y - int.y) original = { value: toNumber(o.str, od.str), x: o.x, y: o.y };
    }
    anchors.push({ price: toNumber(int.str, dec.str), x: int.x, y: int.y, left: original ? original.x : int.x, original });
  }

  // Ogni testo appartiene al riquadro il cui prezzo gli sta subito sotto nella stessa colonna.
  const owner = (item: PdfTextItem, tolerance: number, minDy = -30, leftSide = 14): Anchor | null => {
    let best: Anchor | null = null;
    for (const anchor of anchors) {
      const dy = item.y - anchor.y;
      const dx = item.x - anchor.left;
      if (dy < minDy || dy > 300 || dx < -leftSide || dx > tolerance) continue;
      if (!best || dy < item.y - best.y) best = anchor;
    }
    return best;
  };

  const used = new Set<PdfTextItem>();
  const build = (anchor: Anchor, leftSide: number): CoopBlock | { skip: string } => {
    const mine = (filter: (item: PdfTextItem) => boolean, tolerance: number, minDy = -30) =>
      items.filter((item) => !used.has(item) && filter(item) && owner(item, tolerance, minDy, leftSide) === anchor);

    const nameLines = mine((i) => i.size >= 9.5 && i.size <= 13.5 && !LABEL.test(i.str) && !/^un esempio:?$/i.test(i.str) && !INT.test(i.str) && !DEC.test(i.str) && !/€/.test(i.str), 14, -2).sort((a, b) => b.y - a.y);
    const descLines = mine((i) => i.size >= 7.5 && i.size < 9.5 && !LABEL.test(i.str) && !UNIT_PRICE.test(i.str) && !/^al\s/i.test(i.str) && !/€/.test(i.str), 14, -2).sort((a, b) => b.y - a.y);
    const perKg = mine((i) => /^al\s+(kg|l|litro)$/i.test(i.str), 40).some((i) => Math.abs(i.y - anchor.y) > 30);
    const unitItem = items.find((i) => UNIT_PRICE.test(i.str) && i.y < anchor.y && anchor.y - i.y < 30 && Math.abs(i.x - anchor.left) < 20);
    const unitLabel = unitItem ? items.find((i) => /^al\s+(kg|l|litro)$/i.test(i.str) && Math.abs(i.y - unitItem.y) < 3 && i.x > unitItem.x) : null;
    const labels = mine((i) => /SOCI/i.test(i.str), 125);
    const percentItem = mine((i) => INT.test(i.str) && i.size >= 18 && i.size <= 27, 110)[0];

    // Il blocco di nome deve stare sopra al prezzo e senza buchi grandi: si tiene la catena più vicina al prezzo.
    const top = anchor.original ? anchor.original.y : anchor.y + 30;
    const chain: PdfTextItem[] = [];
    let cursor = top;
    for (const line of [...nameLines, ...descLines].filter((l) => l.y > top - 8).sort((a, b) => a.y - b.y)) {
      if (line.y - cursor > (chain.length === 0 ? 170 : 18)) break;
      chain.push(line);
      cursor = line.y;
    }
    const nameParts = chain.filter((l) => l.size >= 9.5).sort((a, b) => b.y - a.y).map((l) => l.str);
    const descParts = chain.filter((l) => l.size < 9.5).sort((a, b) => b.y - a.y).map((l) => l.str);
    for (const line of chain) used.add(line);

    const rawName = nameParts.join(" ").trim();
    if (!rawName) {
      return { skip: "nome del prodotto non trovato" };
    }

    const descText = descParts.join(" ").replace(/\s+/g, " ").trim();
    const sizes = [...descText.matchAll(SIZE)].map((m) => m[1].replace(/\s+/g, " ").trim());
    const packageText = sizes.length > 0 ? sizes[sizes.length - 1].replace(/\blt\b/i, "l") : null;
    const descName = descParts
      .map((part) =>
        part
          .replace(SIZE, "")
          .replace(/\bal\s+kg\b/gi, "")
          .replace(/\b(?:da|di|circa)\s*(?=[.,;]|$)/gi, "")
          .replace(/\s*;\s*sgocc\.?/gi, "")
          .replace(/\s+([.,;])/g, "$1")
          .replace(/[\s,;]+$/g, "")
          .replace(/^[\s,;.]+/g, ""),
      )
      .filter((part) => part && !/^\d+\s*(pezzi|pz)$/i.test(part))
      .join(" ");

    const price = anchor.price;
    let originalPrice = anchor.original && anchor.original.value > price ? anchor.original.value : null;
    const percent = percentItem ? Number(percentItem.str) : null;
    // Lo sconto stampato deve tornare con i due prezzi: altrimenti il riquadro è stato letto male.
    if (originalPrice !== null && percent !== null) {
      const computed = discountPercent(price, originalPrice);
      if (computed === null || Math.abs(computed - percent) > 3) {
        return { skip: `${rawName}: sconto ${percent}% non coerente con ${originalPrice} → ${price}` };
      }
    }
    if (originalPrice !== null && price >= originalPrice) originalPrice = null;

    let unitPrice: number | null = null;
    let unit: PricingUnit | null = null;
    if (unitItem && unitLabel) {
      unitPrice = Number(unitItem.str.match(UNIT_PRICE)![1].replace(",", "."));
      unit = /l/i.test(unitLabel.str.slice(3)) && !/kg/i.test(unitLabel.str) ? "l" : "kg";
    } else if (perKg) {
      unitPrice = price;
      unit = "kg";
    } else {
      const computed = unitPriceFromPackage(price, packageText);
      unitPrice = computed?.unitPrice ?? null;
      unit = computed?.unit ?? null;
    }

    const validity = pageValidity(anchor.y) ?? flyer;
    return {
      name: fixAbbreviations(titleCase(rawName)) + (descName ? ` ${descName}` : ""),
      packageText: perKg && !packageText ? "al kg" : packageText,
      price,
      originalPrice,
      discountPercent: originalPrice !== null ? discountPercent(price, originalPrice) : null,
      unitPrice,
      unit,
      loyalty: labels.length > 0,
      validFrom: validity.from,
      validTo: validity.to,
    };
  };

  // Prima passata con i testi allineati al prezzo; poi i riquadri senza nome riprovano con i testi rimasti (prezzo spostato dal bollino «solo soci»).
  const pending: Anchor[] = [];
  for (const anchor of anchors) {
    const result = build(anchor, 14);
    if ("skip" in result) pending.push(anchor);
    else blocks.push(result);
  }
  for (const anchor of pending) {
    const result = build(anchor, 60);
    if ("skip" in result) skipped.push({ text: `${anchor.price.toFixed(2).replace(".", ",")} €`, reason: result.skip });
    else blocks.push(result);
  }

  return { blocks, skipped };
}

// Validità di una pagina: intestazioni locali ("DAL 15 AL 21 OTTOBRE", scelta per vicinanza verticale) oppure la nota a piè di pagina "Prezzi validi ...".
export function pageValidityOf(items: PdfTextItem[], year: number): (y: number) => Validity | null {
  const local = items
    .filter((i) => /^DAL\s+\d{1,2}\s+AL\s+\d{1,2}\s+[A-ZÌ]+$/i.test(i.str))
    .map((i) => ({ y: i.y, validity: parseValidity(i.str, year) }))
    .filter((h): h is { y: number; validity: Validity } => h.validity !== null);
  if (local.length > 0) return (y) => local.sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0].validity;
  const footer = items.find((i) => /^Prezzi validi/i.test(i.str));
  const validity = footer ? parseValidity(footer.str, year) : null;
  return () => validity;
}

// Periodo del volantino intero: l'intervallo "dal … al …" più ripetuto a piè di pagina.
export function flyerValidityOf(pages: PdfTextItem[][], year: number): Validity | null {
  const counts = new Map<string, { validity: Validity; count: number }>();
  for (const items of pages) {
    const footer = items.find((i) => /^Prezzi validi/i.test(i.str));
    const validity = footer ? parseValidity(footer.str, year) : null;
    if (!validity?.from) continue;
    const key = `${validity.from}|${validity.to}`;
    const entry = counts.get(key) ?? { validity, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.validity ?? null;
}
