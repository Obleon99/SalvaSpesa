import type { PricingUnit } from "@salvaspesa/shared-types";
import type { PdfTextItem } from "./pdf";
import { discountPercent, parseEuro, unitPriceFromPackage } from "./parse";

export interface EkomBlock {
  name: string;
  packageText: string | null;
  price: number;
  originalPrice: number;
  discountPercent: number | null;
  unitPrice: number | null;
  unit: PricingUnit | null;
  // Offerta riservata ai possessori della carta Ekom UP.
  loyalty?: boolean;
}

export interface EkomPageResult {
  blocks: EkomBlock[];
  skipped: { text: string; reason: string }[];
}

const PRICE = /^\d{1,3},\d{2}$/;
const ORIGINAL = /^DA\s+(\d{1,3},\d{2})\s*€?$/i;
const UNIT = /^AL\s+(KG|LT|L|PZ)\s+(\d{1,3},\d{2})\s*€?$/i;
const SIZE = /^(G|KG|ML|CL|LT|L)\s+(\d+(?:[.,]\d+)?)(?:\s*X\s*(\d+))?$/i;
const NEAR_X = 4;
const LINE_GAP = 18;

// Maiuscola a inizio parola e dopo l'apostrofo solo se preceduto da una lettera sola (L'Artigiano, D'Abruzzo).
const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s/-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
    .replace(/(^|[\s/-])(\p{L})(['’])(\p{L})/gu, (_, sep: string, first: string, apostrophe: string, next: string) => `${sep}${first}${apostrophe}${next.toUpperCase()}`);

// Formato attaccato alla fine di una riga ("... DELICATO G 28X4", "DIVERSI TIPI ML 330").
const TRAILING_SIZE = /\s+(G|KG|ML|CL|LT|L)\s+(\d+(?:[.,]\d+)?)(?:\s*X\s*(\d+))?$/i;

function sizeToText(match: RegExpMatchArray): string {
  const unit = match[1].toLowerCase() === "lt" ? "l" : match[1].toLowerCase();
  const multiplier = match[3] ? `${match[3]} x ` : "";
  return `${multiplier}${match[2]} ${unit}`;
}

// Legge i riquadri prodotto dei volantini Ekom: "DA 1,29 €" (prezzo pieno), prezzo grande, "AL KG 1,28 €" e percentuale.
export function parseEkomPage(items: PdfTextItem[]): EkomPageResult {
  const blocks: EkomBlock[] = [];
  const skipped: EkomPageResult["skipped"] = [];

  for (const original of items.filter((i) => ORIGINAL.test(i.str))) {
    const originalPrice = parseEuro(original.str.replace(/^DA\s+/i, ""));
    const left = original.x;

    const price = items
      .filter((i) => PRICE.test(i.str) && i.y < original.y && original.y - i.y < 110 && i.x > left - 12 && i.x < left + 90)
      .sort((a, b) => b.size - a.size || b.y - a.y)[0];
    if (!price || originalPrice === null) {
      skipped.push({ text: original.str, reason: "prezzo non trovato" });
      continue;
    }

    const unitItem = items
      .filter((i) => UNIT.test(i.str) && i.y < price.y && price.y - i.y < 40 && Math.abs(i.x - price.x) < 80)
      .sort((a, b) => b.y - a.y)[0];

    // Layout A: descrizione sopra "DA ... €". Layout B: intestazione "SCONTO 25 %" sopra, descrizione sotto il prezzo.
    const chain = (candidates: PdfTextItem[], from: number, direction: 1 | -1, firstGap = LINE_GAP): PdfTextItem[] => {
      const lines: PdfTextItem[] = [];
      let cursor = from;
      let gap = firstGap;
      for (const line of candidates.sort((a, b) => direction * (a.y - b.y))) {
        if (Math.abs(line.y - cursor) > gap) break;
        gap = LINE_GAP;
        if (PRICE.test(line.str) || ORIGINAL.test(line.str) || UNIT.test(line.str) || line.str === "€") break;
        lines.push(line);
        cursor = line.y;
      }
      return lines;
    };
    const isHeader = (text: string) => /^(SCONTO|%|\d{1,2})$/i.test(text);

    const above = chain(
      items.filter((i) => Math.abs(i.x - left) <= NEAR_X && i.y > original.y && i.y - original.y < 90),
      original.y,
      1,
    ).filter((line) => !isHeader(line.str));

    // Layout C: descrizione a destra del prezzo, accanto all'intestazione "SCONTO 25 %".
    const rightCandidates = items.filter(
      (i) =>
        i.x > left + 50 &&
        i.x < left + 125 &&
        i.y < original.y + 40 &&
        i.y > original.y - 22 &&
        !isHeader(i.str) &&
        !PRICE.test(i.str) &&
        !ORIGINAL.test(i.str) &&
        !UNIT.test(i.str) &&
        i.str !== "€",
    );
    const columns = new Map<number, PdfTextItem[]>();
    for (const item of rightCandidates) {
      const key = [...columns.keys()].find((x) => Math.abs(x - item.x) <= NEAR_X) ?? item.x;
      columns.set(key, [...(columns.get(key) ?? []), item]);
    }
    const bestColumn = [...columns.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    const right = chain(bestColumn, Math.max(...bestColumn.map((i) => i.y), 0) + 1, -1, 12);

    const belowStart = Math.min(price.y, unitItem?.y ?? price.y);
    const below = chain(
      items.filter((i) => i.x >= left - 12 && i.x <= left + 8 && i.y < belowStart && belowStart - i.y < 90),
      belowStart,
      -1,
      46,
    ).filter((line) => !isHeader(line.str));

    const descriptors = (above.length > 0 ? above : right.length > 0 ? right : below).sort((a, b) => b.y - a.y);

    const priceValue = parseEuro(`${price.str} €`);
    if (priceValue === null || priceValue >= originalPrice) {
      skipped.push({ text: descriptors.map((d) => d.str).join(" "), reason: "prezzo non inferiore al prezzo pieno" });
      continue;
    }
    // La percentuale in testata a volte non coincide con i prezzi stampati: lo sconto si calcola dai prezzi, se plausibile.
    const computed = discountPercent(priceValue, originalPrice);
    if (computed === null || computed < 3 || computed > 70) {
      skipped.push({ text: descriptors.map((d) => d.str).join(" "), reason: `sconto non plausibile (${computed ?? 0}%)` });
      continue;
    }

    let packageText: string | null = null;
    const nameParts: string[] = [];
    for (const line of descriptors.map((d) => d.str)) {
      const whole = packageText === null ? line.match(SIZE) : null;
      const trailing = packageText === null && !whole ? line.match(TRAILING_SIZE) : null;
      if (whole) packageText = sizeToText(whole);
      else if (trailing) {
        packageText = sizeToText(trailing);
        nameParts.push(line.slice(0, trailing.index).trim());
      } else nameParts.push(line);
    }
    if (nameParts.filter(Boolean).length === 0) {
      skipped.push({ text: original.str, reason: "descrizione non trovata" });
      continue;
    }

    const unitMatch = unitItem?.str.match(UNIT);
    const fromLabel = unitMatch
      ? {
          unitPrice: parseEuro(`${unitMatch[2]} €`) ?? 0,
          unit: (unitMatch[1].toUpperCase() === "KG" ? "kg" : unitMatch[1].toUpperCase() === "PZ" ? "pz" : "l") as PricingUnit,
        }
      : null;
    const unit = fromLabel && fromLabel.unitPrice > 0 ? fromLabel : packageText ? unitPriceFromPackage(priceValue, packageText) : null;

    // Alcuni riquadri elencano più varianti ("... Al Kg 21,73 € - Al Naturale ..."): si tiene la prima.
    const cleanName = nameParts
      .join(" ")
      .split(/\s+AL\s+(?:KG|LT)\s+\d/i)[0]
      .replace(/[\s,;-]+$/, "")
      .trim();

    blocks.push({
      name: titleCase(cleanName),
      packageText,
      price: priceValue,
      originalPrice,
      discountPercent: computed,
      unitPrice: unit?.unitPrice ?? null,
      unit: unit?.unit ?? null,
    });
  }

  return { blocks, skipped };
}

const ANCHOR = /^ANZICH[ÉE]\s+(\d{1,3},\d{2})\s*€?$/i;

// Pagina con le offerte riservate ai possessori di Ekom UP: riquadri "- 20 % / ANZICHÉ 2,49 € / € 1,99 / AL KG 6,63 €".
export const isEkomUpPage = (items: PdfTextItem[]): boolean => items.some((i) => /EKOM UP/i.test(i.str) && i.size >= 20);

export function parseEkomUpPage(items: PdfTextItem[]): EkomPageResult {
  const blocks: EkomBlock[] = [];
  const skipped: EkomPageResult["skipped"] = [];
  const anchors = items.filter((i) => ANCHOR.test(i.str));

  const isDescriptor = (i: PdfTextItem) =>
    i.size >= 6.5 &&
    i.size <= 12 &&
    !ANCHOR.test(i.str) &&
    !UNIT.test(i.str) &&
    !PRICE.test(i.str) &&
    !/^[-%€]$/.test(i.str) &&
    !/^\d{1,2}$/.test(i.str) &&
    !/^20\d\d$/.test(i.str);

  for (const anchor of anchors) {
    const originalPrice = parseEuro(anchor.str.replace(/^ANZICH[ÉE]\s+/i, ""));
    const price = items
      .filter((i) => PRICE.test(i.str) && i.size >= 20 && i.y < anchor.y && anchor.y - i.y < 60 && Math.abs(i.x - anchor.x) < 30)
      .sort((a, b) => b.y - a.y)[0];
    const priceValue = price ? parseEuro(`${price.str} €`) : null;
    if (originalPrice === null || priceValue === null || priceValue >= originalPrice) {
      skipped.push({ text: anchor.str, reason: "prezzo Ekom UP non trovato" });
      continue;
    }
    const computed = discountPercent(priceValue, originalPrice);
    if (computed === null || computed < 3 || computed > 70) {
      skipped.push({ text: anchor.str, reason: `sconto non plausibile (${computed ?? 0}%)` });
      continue;
    }

    const unitItem = items.find((i) => UNIT.test(i.str) && i.y < anchor.y && anchor.y - i.y < 70 && Math.abs(i.x - anchor.x) < 30);

    // Ogni testo appartiene al riquadro il cui prezzo gli sta più vicino a sinistra.
    const descriptors = items
      .filter((i) => isDescriptor(i) && i.y < anchor.y + 30 && anchor.y - i.y < 130)
      .filter((i) => {
        const dx = i.x - anchor.x;
        if (dx < -20 || dx > 150) return false;
        return !anchors.some((other) => other !== anchor && Math.abs(other.y - anchor.y) < 20 && i.x - other.x >= -20 && i.x - other.x < dx);
      })
      .sort((a, b) => b.y - a.y || a.x - b.x);

    let packageText: string | null = null;
    const nameParts: string[] = [];
    for (const line of descriptors.map((d) => d.str)) {
      const whole = packageText === null ? line.match(SIZE) : null;
      const trailing = packageText === null && !whole ? line.match(TRAILING_SIZE) : null;
      if (whole) packageText = sizeToText(whole);
      else if (trailing) {
        packageText = sizeToText(trailing);
        nameParts.push(line.slice(0, trailing.index).trim());
      } else nameParts.push(line);
    }
    const name = titleCase(nameParts.join(" ").replace(/[\s,;-]+$/, "").trim());
    if (!name) {
      skipped.push({ text: anchor.str, reason: "descrizione non trovata" });
      continue;
    }

    const unitMatch = unitItem?.str.match(UNIT);
    const fromLabel = unitMatch
      ? {
          unitPrice: parseEuro(`${unitMatch[2]} €`) ?? 0,
          unit: (unitMatch[1].toUpperCase() === "KG" ? "kg" : unitMatch[1].toUpperCase() === "PZ" ? "pz" : "l") as PricingUnit,
        }
      : null;
    const unit = fromLabel && fromLabel.unitPrice > 0 ? fromLabel : packageText ? unitPriceFromPackage(priceValue, packageText) : null;

    blocks.push({ name, packageText, price: priceValue, originalPrice, discountPercent: computed, unitPrice: unit?.unitPrice ?? null, unit: unit?.unit ?? null, loyalty: true });
  }
  return { blocks, skipped };
}
