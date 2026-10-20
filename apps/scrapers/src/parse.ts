import * as cheerio from "cheerio";
import type { PricingUnit } from "@salvaspesa/shared-types";

function parseNumber(raw: string): number | null {
  let text = raw.trim();
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function parseEuro(text: string | null | undefined): number | null {
  if (!text) return null;
  const clean = text.replace(/ /g, " ");
  const match = clean.match(/(\d[\d.,]*)\s*€/) ?? clean.match(/€\s*(\d[\d.,]*)/);
  return match ? parseNumber(match[1]) : null;
}

export interface UnitPrice {
  unitPrice: number;
  unit: PricingUnit;
}

// Accetta "1 kg = 6.60 €", "1 kg 18,86 €", "100 g 1,20 €" e normalizza a €/kg, €/l o €/pz.
export function parseUnitPrice(text: string | null | undefined): UnitPrice | null {
  if (!text) return null;
  const clean = text.replace(/ /g, " ");
  const match = clean.match(/(\d+(?:[.,]\d+)?)?\s*(kg|ml|cl|g|l|pz)\b\s*[=:]?\s*(\d[\d.,]*)\s*€?/i);
  if (!match) return null;

  const quantity = match[1] ? parseNumber(match[1]) : 1;
  const price = parseNumber(match[3]);
  if (quantity === null || quantity <= 0 || price === null) return null;

  switch (match[2].toLowerCase()) {
    case "kg":
      return { unitPrice: round2(price / quantity), unit: "kg" };
    case "g":
      return { unitPrice: round2((price / quantity) * 1000), unit: "kg" };
    case "l":
      return { unitPrice: round2(price / quantity), unit: "l" };
    case "cl":
      return { unitPrice: round2((price / quantity) * 100), unit: "l" };
    case "ml":
      return { unitPrice: round2((price / quantity) * 1000), unit: "l" };
    default:
      return { unitPrice: round2(price / quantity), unit: "pz" };
  }
}

// Fallback quando il sito non indica il prezzo al kg/l: lo ricava dal peso in confezione ("4x 56 g", "0,132 kg", "12 l").
export function unitPriceFromPackage(price: number, packageText: string | null | undefined): UnitPrice | null {
  if (!packageText) return null;
  const loose = packageText.match(/\bal\s*(kg|l)\b/i);
  if (loose) return { unitPrice: round2(price), unit: loose[1].toLowerCase() as PricingUnit };
  const match = packageText.replace(/ /g, " ").match(/(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|ml|cl|g|l)\b/i);
  if (!match) return null;

  const multiplier = match[1] ? Number(match[1]) : 1;
  const quantity = parseNumber(match[2]);
  if (quantity === null || quantity <= 0) return null;

  const total = quantity * multiplier;
  switch (match[3].toLowerCase()) {
    case "kg":
      return { unitPrice: round2(price / total), unit: "kg" };
    case "g":
      return { unitPrice: round2((price / total) * 1000), unit: "kg" };
    case "l":
      return { unitPrice: round2(price / total), unit: "l" };
    case "cl":
      return { unitPrice: round2((price / total) * 100), unit: "l" };
    default:
      return { unitPrice: round2((price / total) * 1000), unit: "l" };
  }
}

export function discountPercent(price: number, originalPrice: number | null): number | null {
  if (originalPrice === null || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
}

// Estrae le date "dd.mm.yyyy" in ordine di apparizione.
export function parseItalianDates(text: string): string[] {
  return [...text.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`);
}

export function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function endOfDayIso(date: string): string {
  return `${date}T23:59:59.000Z`;
}

export function unixToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

const UPPERCASE_TOKEN = /^[A-ZÀ-ÖØ-Þ0-9&'.\-]+$/;

// I titoli dei volantini spesso iniziano con la marca in maiuscolo ("DIXAN Detersivo liquido").
export function extractBrand(title: string): string | null {
  const tokens = title.trim().split(/\s+/);
  const brandTokens: string[] = [];
  for (const token of tokens) {
    if (token.length >= 2 && /[A-ZÀ-ÖØ-Þ]/.test(token) && UPPERCASE_TOKEN.test(token)) brandTokens.push(token);
    else break;
  }
  if (brandTokens.length === 0 || brandTokens.length === tokens.length) return null;
  return brandTokens.join(" ");
}

export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const $ = cheerio.load(html);
  const items = $("li")
    .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const text = items.length > 0 ? items.join(" · ") : $.root().text().replace(/\s+/g, " ").trim();
  return text || null;
}
